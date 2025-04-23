import { Context } from 'hono';
import { stripe } from '../../../config/stripe';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import crypto from 'crypto';

export async function POST(c: Context) {
  // Get the raw body as a string
  const rawBody = await c.req.raw.text();
  const signature = c.req.header('Stripe-Signature');

  if (!signature) {
    return c.json({ error: 'No signature provided' }, 400);
  }

  let event;

  try {
    // Manual verification of webhook signature
    event = await verifyStripeWebhook(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return c.json({ error: `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}` }, 400);
  }

  const db = createDB();

  // For Connect account events, check the account property
  const isConnectEvent = 'account' in event && event.account;

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object;

      // Find user with this Stripe account ID
      const user = await db.select()
        .from(schema.users)
        .where(eq(schema.users.stripeAccountid, account.id))
        .limit(1);

      if (user.length > 0) {
        // Update user's Stripe connection status
        await db.update(schema.users)
          .set({
            stripeConnected: account.details_submitted && 
                            account.charges_enabled && 
                            account.payouts_enabled &&
                            account.capabilities?.card_payments === 'active'
          })
          .where(eq(schema.users.userid, user[0].userid));
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId && isConnectEvent) {
        console.log(`Updating invoice ${invoiceId} to Paid status from connected account ${event.account}`);
        // Update invoice status to paid
        await db.update(schema.invoices)
          .set({ status: 'Paid' })
          .where(eq(schema.invoices.invoiceid, invoiceId));
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId && isConnectEvent) {
        console.log(`Keeping invoice ${invoiceId} as Sent after session expiration from connected account ${event.account}`);
        // Keep invoice as 'Sent' when session expires
        await db.update(schema.invoices)
          .set({ status: 'Sent' })
          .where(eq(schema.invoices.invoiceid, invoiceId));
      }
      break;
    }
  }

  return c.json({ received: true });
}

/**
 * Manually verify the Stripe webhook signature
 */
async function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  // Parse the signature
  const signatureParts = signature
    .split(',')
    .reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});

  if (!signatureParts.t || !signatureParts.v1) {
    throw new Error('Invalid signature format');
  }

  // Create the signature verification string
  const timestampedPayload = `${signatureParts.t}.${payload}`;
  
  // Compute the expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(timestampedPayload)
    .digest('hex');

  // Compare the expected signature with the one from the header
  if (expectedSignature !== signatureParts.v1) {
    throw new Error('Signature verification failed');
  }

  // Check timestamp (within 5 minutes)
  const timestamp = parseInt(signatureParts.t);
  const now = Math.floor(Date.now() / 1000);
  
  if (now - timestamp > 300) {
    throw new Error('Timestamp outside the tolerance zone');
  }

  // If we got here, the signature is valid
  return JSON.parse(payload) as Stripe.Event;
} 