import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Verify Paddle webhook signature
function verifyPaddleWebhook(
  rawBody: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const verifier = crypto.createVerify('sha256');
    verifier.update(rawBody);
    return verifier.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Error verifying Paddle webhook:', error);
    return false;
  }
}

export async function POST(c: Context) {
  try {
    // Get the raw body and signature
    const rawBody = await c.req.text();
    console.log('rawBody', rawBody);
    const signature = c.req.header('Paddle-Signature');
    
    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }
    
    // Verify the webhook signature
    const publicKey = process.env.PADDLE_PUBLIC_KEY || '';
    const isValid = verifyPaddleWebhook(rawBody, signature, publicKey);
    
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type;
    
    // Get the subscription data
    const subscriptionData = payload.data;
    
    if (!subscriptionData) {
      return c.json({ error: 'Missing subscription data' }, 400);
    }
    
    // Get the user ID from custom data
    const userId = subscriptionData.custom_data?.user_id;
    
    if (!userId) {
      return c.json({ error: 'Missing user ID' }, 400);
    }
    
    const db = createDB();
    
    // Handle different event types
    switch (eventType) {
      case 'subscription.created':
        // For scheduled subscriptions, we don't update the user's status yet
        // We just store the subscription ID for future reference
        if (subscriptionData.scheduled_for) {
          await db.update(schema.users)
            .set({
              paddleSubscriptionId: subscriptionData.id,
              // Don't change trial or subscription status yet
            })
            .where(eq(schema.users.userid, parseInt(userId)));
        } else {
          // For immediate subscriptions, update status right away
          await db.update(schema.users)
            .set({
              subscriptionStatus: 'active',
              subscriptionEndDate: new Date(subscriptionData.end_date),
              paddleSubscriptionId: subscriptionData.id,
              isTrialActive: false // End trial when subscription is created
            })
            .where(eq(schema.users.userid, parseInt(userId)));
        }
        break;
        
      case 'subscription.updated':
        // Check if this is a scheduled subscription that's now active
        if (subscriptionData.status === 'active' && subscriptionData.scheduled_for) {
          // This is a scheduled subscription that has now started
          await db.update(schema.users)
            .set({
              subscriptionStatus: 'active',
              subscriptionEndDate: new Date(subscriptionData.end_date),
              paddleSubscriptionId: subscriptionData.id,
              isTrialActive: false // End trial when subscription becomes active
            })
            .where(eq(schema.users.userid, parseInt(userId)));
        } else {
          // Regular subscription update
          await db.update(schema.users)
            .set({
              subscriptionStatus: 'active',
              subscriptionEndDate: new Date(subscriptionData.end_date),
              paddleSubscriptionId: subscriptionData.id,
              isTrialActive: false // End trial when subscription is updated
            })
            .where(eq(schema.users.userid, parseInt(userId)));
        }
        break;
        
      case 'subscription.canceled':
        // Update subscription status to expired
        await db.update(schema.users)
          .set({
            subscriptionStatus: 'expired',
            subscriptionEndDate: new Date(subscriptionData.end_date),
            isTrialActive: false
          })
          .where(eq(schema.users.userid, parseInt(userId)));
        break;
        
      case 'subscription.payment.succeeded':
        // For scheduled subscriptions, we don't update the status yet
        if (!subscriptionData.scheduled_for) {
          // Update subscription end date only for immediate subscriptions
          await db.update(schema.users)
            .set({
              subscriptionEndDate: new Date(subscriptionData.end_date),
              isTrialActive: false
            })
            .where(eq(schema.users.userid, parseInt(userId)));
        }
        break;
        
      case 'subscription.payment.failed':
        // Optionally handle failed payments
        console.log('Payment failed for user:', userId);
        break;
        
      default:
        console.log('Unhandled event type:', eventType);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error processing Paddle webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
} 