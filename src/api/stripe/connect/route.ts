import { Context } from 'hono';
import { stripe } from '../../../config/stripe';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Save Stripe account ID to user's record
    const db = createDB();
    await db.update(schema.users)
      .set({ stripeAccountid: account.id })
      .where(eq(schema.users.userid, parseInt(userId)));

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL}/dashboard/settings/payments?error=true`,
      return_url: `${process.env.APP_URL}/dashboard/settings/payments`,
      type: 'account_onboarding',
    });

    return c.json({ url: accountLink.url });
  } catch (error) {
    console.error('[STRIPE_CONNECT_ERROR]', error);
    return c.json({ error: 'Internal Error' }, 500);
  }
} 