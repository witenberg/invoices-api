import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq, like, desc } from 'drizzle-orm';
import { stripe } from '../../../../config/stripe';
import type Stripe from 'stripe';

export async function GET(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Invoice ID not provided" }, 400);
    }

    const db = createDB();
    
    // Try fetching by publicId first, then fallback to UUID only if it looks like a UUID
    let invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.publicId, id)
    });
    
    if (!invoice) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(id)) {
        invoice = await db.query.invoices.findFirst({
          where: eq(schema.invoices.invoiceid, id)
        });
      }
    }

    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    // Check if invoice is paid - if not, return empty payments array
    if (invoice.status !== 'Paid') {
      return c.json({ payments: [] });
    }

    // First, check if there are logs for cash payments for this invoice
    // Look for cash payment logs by publicId first, then by internal UUID for backward compatibility
    let cashPaymentLogs = await db.select()
      .from(schema.logs)
      .where(like(schema.logs.action, `%invoice #${invoice.publicId} as paid%`))
      .orderBy(desc(schema.logs.timestamp))
      .limit(1);

    if (!cashPaymentLogs || cashPaymentLogs.length === 0) {
      cashPaymentLogs = await db.select()
        .from(schema.logs)
        .where(like(schema.logs.action, `%invoice #${invoice.invoiceid} as paid%`))
        .orderBy(desc(schema.logs.timestamp))
        .limit(1);
    }
    
    // If we found a cash payment log, create a cash payment record
    if (cashPaymentLogs.length > 0) {
      // Calculate amount from invoice
      let amount = 1000; // Default $10 as fallback
      if (invoice.total) {
        amount = Number(invoice.total) * 100;
      } else if (invoice.products && Array.isArray(invoice.products)) {
        try {
          amount = (invoice.products as any[]).reduce((sum, product) => {
            const price = parseFloat(product.amount) || 0;
            const quantity = parseInt(product.quantity) || 1;
            return sum + (price * quantity * 100);
          }, 0);
        } catch (e) {
          console.error('Error calculating amount from products', e);
        }
      }
      
      const cashPayment = {
        id: `cash_${id}_${Date.now()}`,
        amount: Math.round(amount),
        currency: invoice.currency.toLowerCase(),
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
        paymentMethod: 'Cash'
      };
      
      return c.json({ payments: [cashPayment] });
    }
    
    // Continue with the rest of the function to check for Stripe-based payments
    // Fetch user for Stripe account ID
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, invoice.userid),
      columns: {
        stripeAccountid: true
      }
    });

    if (!user || !user.stripeAccountid) {
      return c.json({ error: "User Stripe account not found" }, 404);
    }

    // Array to hold all found payments
    const payments = [];

    // First, try to find any payment intents with this invoice ID in metadata
    // This will catch manual payments marked through our mark-paid endpoint
    try {
      const paymentIntents = await stripe.paymentIntents.list(
        {
          limit: 10,
          created: {
            // Look at payment intents from the last 30 days
            gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
          }
        },
        {
          stripeAccount: user.stripeAccountid
        }
      );

      // Filter payment intents by checking metadata
      const relevantPaymentIntents = paymentIntents.data.filter((pi: any) => 
        pi.metadata && (pi.metadata.invoiceId === invoice.publicId.toString() || pi.metadata.invoiceId === invoice.invoiceid.toString())
      );

      // Add these to the payments array
      for (const pi of relevantPaymentIntents) {
        payments.push({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created,
          paymentMethod: pi.metadata?.paymentType || pi.payment_method_types?.join(', ') || 'card'
        });
      }
    } catch (error) {
      console.error('Error fetching payment intents:', error);
      // Continue with other methods
    }

    // If we already found payments, return them without checking sessions
    if (payments.length > 0) {
      return c.json({ payments });
    }

    // For Connect accounts, we need to fetch all recent sessions and filter manually
    try {
      const sessions = await stripe.checkout.sessions.list(
        {
          limit: 100, // Increase limit to improve chances of finding the right session
          created: {
            // Look at sessions from the last 30 days
            gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
          }
        },
        {
          stripeAccount: user.stripeAccountid
        }
      );

      // Filter sessions manually by checking metadata
      const relevantSessions = sessions.data.filter((session: any) => 
        session.metadata && (session.metadata.invoiceId === invoice.publicId.toString() || session.metadata.invoiceId === invoice.invoiceid.toString())
      );

      if (relevantSessions.length === 0) {
        // If no sessions found but we still have payments from previous steps
        if (payments.length > 0) {
          return c.json({ payments });
        }
        // Otherwise return empty payments array
        return c.json({ payments: [] });
      }

      // Process sessions to get payment data
      for (const session of relevantSessions) {
        // If session has payment intent, try to get payment details
        if (session.payment_intent && typeof session.payment_intent === 'string') {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              session.payment_intent,
              {
                stripeAccount: user.stripeAccountid
              }
            );
            
            if (paymentIntent) {
              payments.push({
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                created: paymentIntent.created,
                paymentMethod: paymentIntent.payment_method_types?.join(', ') || 'card'
              });
            }
          } catch (error) {
            console.error('Error fetching payment intent:', error);
          }
        } else if (session.status === 'complete') {
          // If no payment intent but session is complete, create a synthetic payment record
          payments.push({
            id: session.id,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'succeeded',
            created: session.created,
            paymentMethod: 'Stripe Checkout'
          });
        }
      }

      return c.json({ payments });
    } catch (error) {
      console.error('Error fetching checkout sessions:', error);
      // If we already found payments from previous steps
      if (payments.length > 0) {
        return c.json({ payments });
      }
      
      // Create a fallback payment record based on invoice data
      if (invoice.status === 'Paid') {
        // Calculate a reasonable amount for the fallback payment
        let amount = 1000; // Default $10.00 in cents as fallback
        
        // Try to get amount from products if available
        if (invoice.products && Array.isArray(invoice.products)) {
          try {
            // Sum up product amounts
            amount = (invoice.products as any[]).reduce((sum, product) => {
              const price = parseFloat(product.amount) || 0;
              const quantity = parseInt(product.quantity) || 1;
              return sum + (price * quantity * 100); // Convert to cents
            }, 0);
          } catch (e) {
            console.error('Error calculating amount from products:', e);
            // Keep using the default amount
          }
        }

        const fallbackPayment = {
          id: `fallback_${id}`,
          amount,
          currency: invoice.currency.toLowerCase(),
          status: 'succeeded',
          created: Math.floor(new Date(invoice.date).getTime() / 1000),
          paymentMethod: 'Cash' // Changed to Cash for manually marked
        };
        return c.json({ payments: [fallbackPayment] });
      }
      
      return c.json({ payments: [] });
    }
  } catch (error) {
    console.error("Error fetching payment information:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 