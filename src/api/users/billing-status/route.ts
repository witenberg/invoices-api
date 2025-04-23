import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const userId = c.req.query('id');
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const db = createDB();
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, userId),
      columns: {
        isTrialActive: true,
        trialEndDate: true,
        isSubscriptionActive: true,
        subscriptionEndDate: true,
        paddleSubscriptionId: true
      }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const now = new Date();
    let daysRemaining = 0;

    // Calculate trial days remaining
    if (user.isTrialActive && user.trialEndDate) {
      if (user.trialEndDate > now) {
        daysRemaining = Math.ceil((user.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // Trial expired, update the status
        await db.update(schema.users)
          .set({ isTrialActive: false })
          .where(eq(schema.users.userid, userId));
      }
    }

    // Check subscription status
    let subscriptionStatus = 'none';
    if (user.isSubscriptionActive) {
      if (user.subscriptionEndDate) {
        if (user.subscriptionEndDate > now) {
          subscriptionStatus = 'active';
        } else {
          // Subscription expired, update the status
          await db.update(schema.users)
            .set({ isSubscriptionActive: false })
            .where(eq(schema.users.userid, userId));
          subscriptionStatus = 'expired';
        }
      } else {
        subscriptionStatus = 'active';
      }
    }

    return c.json({
      isTrialActive: user.isTrialActive,
      daysRemaining,
      subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
    //   scheduledSubscription: user.paddleSubscriptionId ? {
    //     startDate: user.trialEndDate || new Date(),
    //     planName: 'PRO' // You might want to fetch this from Paddle API
    //   } : null
    });
  } catch (error) {
    console.error('Error fetching billing status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
} 