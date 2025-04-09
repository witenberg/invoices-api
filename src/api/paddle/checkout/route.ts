import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { paddlePricesIds } from '../../../constants/prices';

// Helper function to check if a user is verified
async function checkUserVerified(userId: number): Promise<boolean> {
  try {
    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, userId),
      columns: {
        isverified: true
      }
    });

    return user?.isverified || false;
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
}

// Helper function to get user's trial end date
async function getUserTrialEndDate(userId: number): Promise<Date | null> {
  try {
    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, userId),
      columns: {
        trialEndDate: true,
        isTrialActive: true
      }
    });

    if (!user?.isTrialActive || !user.trialEndDate) {
      return null;
    }

    return new Date(user.trialEndDate);
  } catch (error) {
    console.error("Error getting trial end date:", error);
    return null;
  }
}

export async function POST(c: Context) {
  try {
    const { planId, userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // const isUserVerified = await checkUserVerified(parseInt(userId.toString()));
    
    // if (!isUserVerified) {
    //   return c.json({ error: 'Unauthorized' }, 401);
    // }

    const priceId = paddlePricesIds[planId];

    if (!priceId) {
      return c.json({ error: 'Invalid plan selected' }, 400);
    }

    // Get the trial end date
    const trialEndDate = await getUserTrialEndDate(parseInt(userId.toString()));
    
    // Prepare the request body
    const requestBody: any = {
      items: [
        {
          price_id: priceId,
          quantity: 1,
        }
      ],
      custom_data: {
        user_id: userId
      },
    };

    // If trial is active, set the subscription to start after trial ends
    if (trialEndDate) {
      // Format the date as ISO string and remove milliseconds
      const formattedDate = trialEndDate.toISOString().split('.')[0] + 'Z';
      requestBody.scheduled_for = formattedDate;
    }

    const response = await fetch('https://sandbox-api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;

    if (data.data && data.data.checkout.url) {
      return c.json({
        success: true,
        url: data.data.checkout.url
      });
    } else {
      console.error('Paddle error:', data);
      return c.json({ success: false, error: data.error?.detail || 'Unknown error' }, 500);
    }
  } catch (error) {
    console.error('Paddle checkout error:', error);
    return c.json({ error: 'Failed to create checkout' }, 500);
  }
}