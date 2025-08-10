import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Subscription ID not provided" }, 400);
    }

    const db = createDB();
    
    // Fetch subscription status - try by public ID first, then by UUID
    let subscription = await db.select({
      status: schema.subscriptions.status,
      subscriptionid: schema.subscriptions.subscriptionid,
      isDeleted: schema.subscriptions.isDeleted
    })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.publicId, id))
    .limit(1);

    if (!subscription || subscription.length === 0) {
      // Try by UUID as fallback
      subscription = await db.select({
        status: schema.subscriptions.status,
        subscriptionid: schema.subscriptions.subscriptionid,
        isDeleted: schema.subscriptions.isDeleted
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.subscriptionid, id))
      .limit(1);
    }

    if (!subscription || subscription.length === 0) {
      return c.json({ error: "Subscription not found" }, 404);
    }

    return c.json({ 
      status: subscription[0].status,
      isDeleted: subscription[0].isDeleted || false
    });
    
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 

export async function PATCH(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: "Subscription ID not provided" }, 400);
    }

    const body = await c.req.json();
    const { status, isDeleted } = body;
    
    if (!status && isDeleted === undefined) {
      return c.json({ error: "Either status or isDeleted must be provided" }, 400);
    }

    // Valid status values if status is provided
    if (status) {
      const validStatuses = ['Active', 'Paused', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return c.json({ error: "Invalid status value" }, 400);
      }
    }

    const db = createDB();
    
    // First check if subscription exists - try by public ID first, then by UUID
    let existingSubscription = await db.select({
      status: schema.subscriptions.status,
      subscriptionid: schema.subscriptions.subscriptionid,
      isDeleted: schema.subscriptions.isDeleted
    })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.publicId, id))
    .limit(1);

    if (!existingSubscription || existingSubscription.length === 0) {
      // Try by UUID as fallback
      existingSubscription = await db.select({
        status: schema.subscriptions.status,
        subscriptionid: schema.subscriptions.subscriptionid,
        isDeleted: schema.subscriptions.isDeleted
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.subscriptionid, id))
      .limit(1);
    }

    if (!existingSubscription || existingSubscription.length === 0) {
      return c.json({ error: "Subscription not found" }, 404);
    }

    // Update data based on what's provided
    const updateData: any = {};
    
    // If marking as deleted, also set status to Paused
    if (isDeleted === true) {
      updateData.isDeleted = true;
      updateData.status = 'Paused';
    } 
    // Otherwise just update provided fields
    else {
      if (status) updateData.status = status;
      if (isDeleted !== undefined) updateData.isDeleted = isDeleted;
    }

    // Use the actual UUID for the update
    const subscriptionId = existingSubscription[0].subscriptionid;
    await db.update(schema.subscriptions)
      .set(updateData)
      .where(eq(schema.subscriptions.subscriptionid, subscriptionId));

    return c.json({ 
      success: true,
      status: updateData.status || existingSubscription[0].status,
      isDeleted: isDeleted !== undefined ? isDeleted : existingSubscription[0].isDeleted,
      message: "Subscription updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating subscription status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}
