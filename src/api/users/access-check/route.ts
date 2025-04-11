import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const userId = c.req.query('id');
    console.log(userId);
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const db = createDB();
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, parseInt(userId)),
      columns: {
        isTrialActive: true,
        trialEndDate: true,
        isSubscriptionActive: true,
        subscriptionEndDate: true
      }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const now = new Date();
    let hasAccess = false;

    // Check trial period first
    if (user.isTrialActive && user.trialEndDate) {
      if (user.trialEndDate > now) {
        hasAccess = true;
      } else {
        // Trial expired, update the status
        await db.update(schema.users)
          .set({ isTrialActive: false })
          .where(eq(schema.users.userid, parseInt(userId)));
      }
    }

    // If no trial or trial expired, check subscription
    if (!hasAccess && user.isSubscriptionActive) {
      if (user.subscriptionEndDate) {
        if (user.subscriptionEndDate > now) {
          hasAccess = true;
        } else {
          // Subscription expired, update the status
          await db.update(schema.users)
            .set({ isSubscriptionActive: false })
            .where(eq(schema.users.userid, parseInt(userId)));
        }
      } else {
        // No end date specified, assume active
        hasAccess = true;
      }
    }

    return c.json({ hasAccess });
  } catch (error) {
    console.error('Error checking user access:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}
