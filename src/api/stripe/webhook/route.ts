import { Context } from 'hono';
import { stripe } from '../../../config/stripe';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  const body = await c.req.text();
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return c.json({ error: 'No signature provided' }, 400);
  }

  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.log(error)
    return c.json({ error: `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}` }, 400);
  }

  const db = createDB();

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object;

      // Find user with this Stripe account ID
      const user = await db.select()
        .from(schema.users)
        .where(eq(schema.users.stripeAccountid, account.id))
        .limit(1);

      if (user.length > 0) {
        // Update user's Stripe connection status
        await db.update(schema.users)
          .set({
            stripeConnected: account.details_submitted && 
                            account.charges_enabled && 
                            account.payouts_enabled &&
                            account.capabilities?.card_payments === 'active'
          })
          .where(eq(schema.users.userid, user[0].userid));
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoiceId;

      if (invoiceId) {
        // Update invoice status to paid
        await db.update(schema.invoices)
          .set({ status: 'Paid' })
          .where(eq(schema.invoices.invoiceid, parseInt(invoiceId)));

      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoiceId;

      if (invoiceId) {
        // Update invoice status to indicate payment failure
        await db.update(schema.invoices)
          .set({ status: 'Sent' }) // Reset to Sent status if payment fails
          .where(eq(schema.invoices.invoiceid, parseInt(invoiceId)));
      }
      break;
    }
  }

  return c.json({ received: true });
} 