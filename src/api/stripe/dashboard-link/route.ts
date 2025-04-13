import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { stripe } from '../../../config/stripe';

export async function POST(c: Context) {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const db = createDB();
    // Get user's Stripe account ID
    const [user] = await db.select({
      stripeAccountid: schema.users.stripeAccountid
    }).from(schema.users).where(eq(schema.users.userid, parseInt(userId)));

    if (!user?.stripeAccountid) {
      return c.json({ error: 'Stripe account not connected' }, 400);
    }

    // Generate login link
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountid);

    return c.json({ url: loginLink.url });
  } catch (error) {
    console.error('Error generating Stripe dashboard link:', error);
    return c.json(
      { error: 'Failed to generate dashboard link' },
      500
    );
  }
}
