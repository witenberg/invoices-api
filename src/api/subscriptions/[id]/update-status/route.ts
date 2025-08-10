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
    
    // Try to find subscription by public ID first, then by UUID
    let subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.publicId, id)
    });

    if (!subscription) {
      // Try by UUID as fallback
      subscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.subscriptionid, id)
      });
    }

    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    const result = await db.update(schema.subscriptions)
      .set({ status })
      .where(eq(schema.subscriptions.subscriptionid, subscription.subscriptionid))
      .returning();

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating subscription status:', error);
    return c.json({ error: 'Error updating subscription status' }, 500);
  }
}
