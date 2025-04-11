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
        // Check if user has active trial
        const user = await db.query.users.findFirst({
          where: eq(schema.users.userid, parseInt(userId)),
          columns: {
            isTrialActive: true,
            trialEndDate: true
          }
        });

        // If user has active trial, update the subscription in Paddle
        if (user?.trialEndDate && user.trialEndDate > new Date()) {
          const trialDaysLeft = Math.ceil((user.trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          try {
            const subResponse = await fetch(`${process.env.PADDLE_API_URL}/subscriptions/${subscriptionData.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
              }
            });

            const subData = await subResponse.json() as any;
            const nextBilledAt = new Date(subData.data.next_billed_at);
            nextBilledAt.setDate(nextBilledAt.getDate() + trialDaysLeft);

            const updateResponse = await fetch(`${process.env.PADDLE_API_URL}/subscriptions/${subscriptionData.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
              },
              body: JSON.stringify({
                next_billed_at: nextBilledAt.toISOString(),
                proration_billing_mode: 'do_not_bill',
              }),
            });

            if (!updateResponse.ok) {
              console.error('Failed to update subscription with trial period:', await updateResponse.text());
            } else {
              console.log('Successfully updated subscription with trial period');
            }
          } catch (error) {
            console.error('Error updating subscription with trial period:', error);
          }
        }

        // Update user's subscription status in our database
        await db.update(schema.users)
          .set({
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date(subscriptionData.end_date),
            paddleSubscriptionId: subscriptionData.id,
          })
          .where(eq(schema.users.userid, parseInt(userId)));
        break;

      case 'subscription.updated':
        // Update subscription status
        await db.update(schema.users)
          .set({
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date(subscriptionData.end_date),
            paddleSubscriptionId: subscriptionData.id,
          })
          .where(eq(schema.users.userid, parseInt(userId)));
        break;

      case 'subscription.canceled':
        // Update subscription status to expired
        await db.update(schema.users)
          .set({
            subscriptionStatus: 'expired',
            subscriptionEndDate: new Date(subscriptionData.end_date),
          })
          .where(eq(schema.users.userid, parseInt(userId)));
        break;

      case 'subscription.payment.succeeded':
        // Update subscription end date
        await db.update(schema.users)
          .set({
            subscriptionEndDate: new Date(subscriptionData.end_date),
          })
          .where(eq(schema.users.userid, parseInt(userId)));
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
    return c.json({ error: error }, 500);
  }
} 