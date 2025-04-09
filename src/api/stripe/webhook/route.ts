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

  console.log('Event data object:', event.data.object);

  const session = event.data.object;

  if (event.type === 'account.updated') {
    const account = session;

    // Find user with this Stripe account ID
    const db = createDB();
    const user = await db.select()
      .from(schema.users)
      .where(eq(schema.users.stripeAccountid, account.id))
      .limit(1);

    if (user.length > 0) {
      // Update user's Stripe connection status
      await db.update(schema.users)
        .set({
          stripeConnected: account.details_submitted && account.charges_enabled
        })
        .where(eq(schema.users.userid, user[0].userid));
    }
  }

  return c.json({ received: true });
} 