import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

const subscription_statuses = ['Active', 'Paused', 'Deleted'];

export async function PUT(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: 'Subscription ID not provided' }, 400);
    }
    
    const { status } = await c.req.json();
    
    if (!status || !subscription_statuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    
    const db = createDB();
    const result = await db.update(schema.subscriptions)
      .set({ status })
      .where(eq(schema.subscriptions.subscriptionid, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return c.json({ error: 'Error updating subscription status' }, 500);
  }
}
