import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

// Define types for Paddle API response
interface PaddleSubscriptionItem {
  price_id: string;
  quantity: number;
}

interface PaddleSubscriptionData {
  scheduled_for?: string;
  items?: PaddleSubscriptionItem[];
}

interface PaddleSubscriptionResponse {
  data: PaddleSubscriptionData;
}

export async function GET(c: Context) {
  try {
    const id = c.req.query('id');

    if (!id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, parseInt(id)),
      columns: {
        trialEndDate: true,
        isTrialActive: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        paddleSubscriptionId: true
      }
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if trial has expired
    const now = new Date();
    const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
    
    // If trial has ended, update isTrialActive to false
    if (trialEndDate && trialEndDate < now && user.isTrialActive) {
      await db.update(schema.users)
        .set({ isTrialActive: false })
        .where(eq(schema.users.userid, parseInt(id)));
      
      return c.json({ 
        isTrialActive: false,
        trialEndDate: trialEndDate,
        daysRemaining: 0,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        hasAccess: user.subscriptionStatus === 'active'
      });
    }
    
    // Calculate days remaining in trial
    let daysRemaining = 0;
    if (trialEndDate && trialEndDate > now) {
      const diffTime = trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Check if subscription is active
    const hasActiveSubscription = user.subscriptionStatus === 'active';
    
    // If subscription is active but end date is in the past, update status to expired
    if (hasActiveSubscription && user.subscriptionEndDate && new Date(user.subscriptionEndDate) < now) {
      await db.update(schema.users)
        .set({ subscriptionStatus: 'expired' })
        .where(eq(schema.users.userid, parseInt(id)));
      
      return c.json({ 
        isTrialActive: user.isTrialActive,
        trialEndDate: trialEndDate,
        daysRemaining: daysRemaining,
        subscriptionStatus: 'expired',
        subscriptionEndDate: user.subscriptionEndDate,
        hasAccess: false
      });
    }

    // Check for scheduled subscription
    let scheduledSubscription = null;
    if (user.paddleSubscriptionId && user.isTrialActive) {
      try {
        // Fetch subscription details from Paddle
        const response = await fetch(`https://api.paddle.com/subscriptions/${user.paddleSubscriptionId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
          },
        });
        
        if (response.ok) {
          const paddleData = await response.json() as PaddleSubscriptionResponse;
          
          // Check if this is a scheduled subscription
          if (paddleData.data && paddleData.data.scheduled_for) {
            const scheduledDate = new Date(paddleData.data.scheduled_for);
            
            // Only include if it's scheduled to start after trial ends
            if (trialEndDate && scheduledDate > trialEndDate) {
              // Get plan name from price ID
              let planName = "Subscription";
              if (paddleData.data.items && paddleData.data.items.length > 0) {
                const priceId = paddleData.data.items[0].price_id;
                if (priceId === process.env.PADDLE_MONTHLY_PRICE_ID) {
                  planName = "Monthly Plan";
                } else if (priceId === process.env.PADDLE_ANNUAL_PRICE_ID) {
                  planName = "Annual Plan";
                }
              }
              
              scheduledSubscription = {
                startDate: scheduledDate.toISOString(),
                planName: planName
              };
            }
          }
        }
      } catch (error) {
        console.error("Error fetching scheduled subscription:", error);
      }
    }

    return c.json({ 
      isTrialActive: user.isTrialActive,
      trialEndDate: trialEndDate,
      daysRemaining: daysRemaining,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
      hasAccess: user.isTrialActive || hasActiveSubscription,
      scheduledSubscription: scheduledSubscription
    });
  } catch (error) {
    console.error("Error checking trial status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 