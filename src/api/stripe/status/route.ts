import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Check Stripe connection status in the database
    const db = createDB();
    const user = await db.select({
      stripeConnected: schema.users.stripeConnected,
      stripeAccountid: schema.users.stripeAccountid
    })
    .from(schema.users)
    .where(eq(schema.users.userid, userId))
    .limit(1);

    return c.json({ 
      connected: user[0]?.stripeConnected || false,
      accountId: user[0]?.stripeAccountid || null
    });
  } catch (error) {
    console.error('[STRIPE_STATUS_ERROR]', error);
    return c.json({ error: 'Internal Error' }, 500);
  }
} 