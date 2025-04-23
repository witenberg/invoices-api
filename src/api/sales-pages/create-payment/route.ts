import { Context } from 'hono';
import { stripe } from '../../../config/stripe';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const body = await c.req.json();
    const { salesPageId } = body;

    if (!salesPageId) {
      return c.json({ error: 'Missing sales page ID' }, 400);
    }

    const db = createDB();

    // Fetch sales page details
    const salesPage = await db
      .select({
        id: schema.salesPages.id,
        title: schema.salesPages.title,
        price: schema.salesPages.price,
        currency: schema.salesPages.currency,
        frequency: schema.salesPages.frequency,
        userid: schema.salesPages.userid,
        stripeAccountid: schema.users.stripeAccountid,
        status: schema.salesPages.status
      })
      .from(schema.salesPages)
      .leftJoin(schema.users, eq(schema.users.userid, schema.salesPages.userid))
      .where(eq(schema.salesPages.id, salesPageId))
      .limit(1);

    if (!salesPage[0]) {
      return c.json({ error: 'Sales page not found' }, 404);
    }

    if (!salesPage[0].stripeAccountid) {
      return c.json({ error: 'Seller has not connected Stripe account' }, 400);
    }

    if (salesPage[0].status !== 'Published') {
      return c.json({ error: 'Sales page is not published' }, 400);
    }

    const { stripeAccountid, price, currency, frequency, title } = salesPage[0];

    // Verify the Stripe account is valid and can accept payments
    try {
      const account = await stripe.accounts.retrieve(stripeAccountid);
      if (!account.charges_enabled) {
        return c.json({ error: 'Seller account is not ready to accept payments' }, 400);
      }
    } catch (error) {
      console.error('[DEBUG] Stripe account verification error:', error);
      return c.json({ error: 'Invalid seller account' }, 400);
    }

    // Convert price to cents
    const amount = Math.round(Number(price) * 100);

    // Create checkout session
    const sessionConfig: any = {
      mode: frequency === "One-time payment" ? 'payment' : 'subscription',
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: title,
            },
            unit_amount: amount,
            recurring: frequency !== "One-time payment" ? {
              interval: getStripeInterval(frequency),
              interval_count: getIntervalCount(frequency)
            } : undefined
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/salespage/${salesPageId}/success`,
      cancel_url: `${process.env.APP_URL}/salespage/${salesPageId}`,
      metadata: {
        salesPageId: salesPageId.toString(),
        sellerAccountId: stripeAccountid
      }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig, {
      stripeAccount: stripeAccountid
    });

    return c.json({ url: session.url });
  } catch (error) {
    console.error('[DEBUG] General error:', error);
    return c.json({ error: 'Internal Error' }, 500);
  }
}

function getStripeInterval(frequency: string): 'day' | 'week' | 'month' | 'year' {
  switch (frequency) {
    case 'Weekly':
    case 'Every 2 weeks':
      return 'week';
    case 'Monthly':
    case 'Quarterly':
    case 'Every 6 months':
      return 'month';
    case 'Yearly':
      return 'year';
    default:
      return 'month';
  }
}

function getIntervalCount(frequency: string): number {
  switch (frequency) {
    case 'Weekly':
      return 1;
    case 'Every 2 weeks':
      return 2;
    case 'Monthly':
      return 1;
    case 'Quarterly':
      return 3;
    case 'Every 6 months':
      return 6;
    case 'Yearly':
      return 12;
    default:
      return 1;
  }
} 