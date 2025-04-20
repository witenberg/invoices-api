import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { stripe } from '../../../config/stripe';

interface StripeSession {
    metadata?: {
        salesPageId?: string;
    };
    status: string;
    mode: string;
    payment_intent?: any;
    subscription?: string;
}

export async function GET(c: Context) {
    try {
        const db = createDB();
        const id = c.req.param('id');

        // Fetch sales page details
        const salesPage = await db
            .select({
                id: schema.salesPages.id,
                title: schema.salesPages.title,
                description: schema.salesPages.description,
                price: schema.salesPages.price,
                currency: schema.salesPages.currency,
                language: schema.salesPages.language,
                frequency: schema.salesPages.frequency,
                image_url: schema.salesPages.image_url,
                status: schema.salesPages.status,
                accept_credit_cards: schema.salesPages.accept_credit_cards,
                accept_paypal: schema.salesPages.accept_paypal,
                stripeAccountid: schema.users.stripeAccountid
            })
            .from(schema.salesPages)
            .leftJoin(schema.users, eq(schema.users.userid, schema.salesPages.userid))
            .where(eq(schema.salesPages.id, parseInt(id)))
            .limit(1);

        if (!salesPage[0]) {
            return c.json({ error: 'Sales page not found' }, 404);
        }

        if (!salesPage[0].stripeAccountid) {
            return c.json({ error: 'Seller has not connected Stripe account' }, 400);
        }

        // Fetch all completed checkout sessions for this sales page
        const sessions = await stripe.checkout.sessions.list({
            limit: 100,
            expand: ['data.payment_intent', 'data.subscription']
        }, {
            stripeAccount: salesPage[0].stripeAccountid
        });

        // Filter completed sessions for this sales page
        const completedSessions = sessions.data.filter((session: StripeSession) => 
            session.metadata?.salesPageId === id && 
            session.status === 'complete'
        );

        // Calculate total revenue and orders count
        let totalRevenue = 0;
        let ordersCount = 0;

        for (const session of completedSessions) {
            if (session.mode === 'payment' && session.payment_intent) {
                // One-time payment
                const paymentIntent = session.payment_intent;
                if (paymentIntent.status === 'succeeded') {
                    totalRevenue += paymentIntent.amount / 100;
                    ordersCount++;
                }
            } else if (session.mode === 'subscription' && session.subscription) {
                // Subscription
                const subscription = await stripe.subscriptions.retrieve(session.subscription, {
                    expand: ['items']
                }, {
                    stripeAccount: salesPage[0].stripeAccountid
                });

                if (subscription.status === 'active') {
                    // Add the subscription amount
                    totalRevenue += subscription.items.data[0].price.unit_amount / 100;
                    ordersCount++;
                }
            }
        }

        return c.json({
            ...salesPage[0],
            total_revenue: totalRevenue,
            orders_count: ordersCount
        });

    } catch (error) {
        console.error('Error fetching sales page:', error);
        return c.json({ 
            error: 'Failed to fetch sales page',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
}

export async function POST(c: Context) {
    try {
        const db = createDB();
        const id = c.req.param('id');
        const { status } = await c.req.json();

        if (!['Published', 'Draft'].includes(status)) {
            return c.json({ error: 'Invalid status' }, 400);
        }

        // Update sales page status
        await db
            .update(schema.salesPages)
            .set({ status })
            .where(eq(schema.salesPages.id, parseInt(id)));

        return c.json({ success: true, status });

    } catch (error) {
        console.error('Error updating sales page status:', error);
        return c.json({ 
            error: 'Failed to update status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
}

