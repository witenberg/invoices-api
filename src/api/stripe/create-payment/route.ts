import { Context } from 'hono';
import { stripe } from '../../../config/stripe';

export async function POST(c: Context) {
  try {
    const { amount, currency, accountId, invoiceId } = await c.req.json();

    if (!amount || !currency || !accountId || !invoiceId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amount,
              product_data: {
                name: `Invoice #${invoiceId}`,
              },
            },
          },
        ],
        success_url: `${process.env.APP_URL}/invoices/${invoiceId}?status=success`,
        cancel_url: `${process.env.APP_URL}/invoices/${invoiceId}?status=cancelled`,
        metadata: {
          invoiceId: invoiceId.toString()
        },
      },
      {
        stripeAccount: accountId
      }
    );

    return c.json({ url: session.url });
  } catch (error) {
    console.error('[STRIPE_CREATE_PAYMENT_ERROR]', error);
    return c.json({ error: 'Internal Error' }, 500);
  }
} 