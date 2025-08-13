import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';
import { stripe } from '../../../../config/stripe';

export async function POST(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Invoice ID not provided" }, 400);
    }

    const db = createDB();
    
    // Accept publicId or UUID
    let invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.publicId, id)
    });
    if (!invoice) {
      invoice = await db.query.invoices.findFirst({
        where: eq(schema.invoices.invoiceid, id)
      });
    }

    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    // Check if invoice is already paid
    if (invoice.status === 'Paid') {
      return c.json({ message: "Invoice is already marked as paid" });
    }

    // Fetch user for Stripe account ID
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, invoice.userid),
      columns: {
        stripeAccountid: true,
        userid: true
      }
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Update the invoice status to Paid
    await db.update(schema.invoices)
      .set({ status: 'Paid' })
      .where(eq(schema.invoices.invoiceid, invoice.invoiceid));

    // Create a "Cash payment" record in the logs
    await db.insert(schema.logs).values({
      userid: user.userid,
      action: `Marked invoice #${invoice.publicId} as paid (cash payment)`,
      timestamp: new Date().toISOString()
    });

    // Create a simulated payment record
    const amount = invoice.total ? Number(invoice.total) * 100 : 1000; // Default $10 if no total
    const paymentRecord = {
      id: `cash_payment_${id}_${Date.now()}`,
      amount: Math.round(amount),
      currency: invoice.currency.toLowerCase(),
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      paymentMethod: 'Cash'
    };

    // If user has Stripe connected, try to create a test payment record
    // but continue even if this fails - the invoice is still marked as paid
    if (user.stripeAccountid) {
      try {
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: Math.round(amount),
            currency: invoice.currency.toLowerCase(),
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never'
            },
            confirm: false, // Don't try to confirm yet
            metadata: {
              invoiceId: invoice.publicId.toString(),
              paymentType: 'Cash',
              manuallyMarkedAsPaid: 'true'
            },
             description: `Manual cash payment for Invoice #${invoice.publicId}`
          },
          {
            stripeAccount: user.stripeAccountid
          }
        );
        
        // Now confirm with test payment method
        await stripe.paymentIntents.confirm(
          paymentIntent.id,
          {
            payment_method: 'pm_card_visa', // Use test card
             return_url: `${process.env.APP_URL}/dashboard/invoices/${invoice.publicId}/details`
          },
          {
            stripeAccount: user.stripeAccountid
          }
        );
      } catch (error) {
        console.error('Error creating Stripe payment record:', error);
        // Continue with the manually created payment record
      }
    }

    return c.json({ 
      success: true, 
      message: "Invoice marked as paid", 
      payment: paymentRecord 
    });

  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}
