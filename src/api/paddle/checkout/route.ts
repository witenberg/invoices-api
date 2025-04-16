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

export async function POST(c: Context) {
  try {
    const { planId, userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Check if user is verified
    const isUserVerified = await checkUserVerified(parseInt(userId.toString()));
    
    if (!isUserVerified) {
      return c.json({ error: 'User is not verified' }, 401);
    }

    const priceId = paddlePricesIds[planId];

    if (!priceId) {
      return c.json({ error: 'Invalid plan selected' }, 400);
    }
    
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

    const response = await fetch(`${process.env.PADDLE_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;
    // console.log('Full Paddle response:', JSON.stringify(data, null, 2));
    console.log(data.data.checkout.url);

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