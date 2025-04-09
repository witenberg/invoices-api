import { Context } from 'hono';
import { stripe } from '../../../config/stripe';

export async function POST(c: Context) {
  try {
    const { amount, currency, accountId, metadata } = await c.req.json();

    if (!amount || !currency || !accountId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Invoice Payment',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: accountId,
        },
        metadata,
      },
    });

    return c.json({ url: paymentLink.url });
  } catch (error) {
    console.error('[STRIPE_CREATE_PAYMENT_ERROR]', error);
    return c.json({ error: 'Internal Error' }, 500);
  }
} 