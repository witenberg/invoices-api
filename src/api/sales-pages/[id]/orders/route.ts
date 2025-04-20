import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';
import { stripe } from '../../../../config/stripe';

export async function GET(c: Context) {
    try {
        const db = createDB();
        const salesPageId = c.req.param('id');
        const filter = c.req.query('filter') || 'all';

        // First get the sales page to get the Stripe account ID
        const salesPage = await db
            .select({
                stripeAccountid: schema.users.stripeAccountid
            })
            .from(schema.salesPages)
            .leftJoin(schema.users, eq(schema.users.userid, schema.salesPages.userid))
            .where(eq(schema.salesPages.id, parseInt(salesPageId)))
            .limit(1);

        if (!salesPage[0]?.stripeAccountid) {
            return c.json({ error: 'Sales page not found or Stripe account not connected' }, 404);
        }

        const { stripeAccountid } = salesPage[0];

        // Fetch checkout sessions from Stripe
        const sessions = await stripe.checkout.sessions.list({
            limit: 100,
            expand: ['data.payment_intent', 'data.subscription']
        }, {
            stripeAccount: stripeAccountid
        });

        // Filter sessions by salesPageId in metadata and only completed ones
        const filteredSessions = sessions.data.filter((session: any) => 
            session.metadata?.salesPageId === salesPageId && 
            session.status === 'complete'
        );

        // Process orders from sessions
        const orders = await Promise.all(filteredSessions.map(async (session: any) => {
            if (session.mode === 'subscription' && session.subscription) {
                // Handle subscription
                const subscription = await stripe.subscriptions.retrieve(session.subscription, {
                    expand: ['customer', 'default_payment_method']
                }, {
                    stripeAccount: stripeAccountid
                });

                return {
                    id: subscription.id,
                    type: 'subscription',
                    amount: subscription.items.data[0].price.unit_amount / 100,
                    currency: subscription.items.data[0].price.currency,
                    status: subscription.status === 'active' ? 'Paid' : 'Unpaid',
                    customer_name: subscription.customer?.name || subscription.default_payment_method?.billing_details?.name || 'Unknown',
                    customer_email: subscription.customer?.email || subscription.default_payment_method?.billing_details?.email || 'Unknown',
                    payment_method: getPaymentMethodDisplayName(subscription.default_payment_method?.type || 'Unknown'),
                    created_at: new Date(subscription.created * 1000).toISOString(),
                    next_payment_date: new Date(subscription.current_period_end * 1000).toISOString()
                };
            } else if (session.mode === 'payment' && session.payment_intent) {
                // Handle one-time payment - use the expanded payment_intent directly
                const paymentIntent = session.payment_intent;
                const paymentMethod = session.payment_method_types?.[0] || 'Unknown';

                return {
                    id: paymentIntent.id,
                    type: 'payment',
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    status: paymentIntent.status === 'succeeded' ? 'Paid' : 'Unpaid',
                    customer_name: session.customer_details?.name || 'Unknown',
                    customer_email: session.customer_details?.email || 'Unknown',
                    payment_method: getPaymentMethodDisplayName(paymentMethod),
                    created_at: new Date(paymentIntent.created * 1000).toISOString(),
                    next_payment_date: null
                };
            }
            return null;
        }));

        // Filter out null values and sort by creation date
        const validOrders = orders.filter((order): order is NonNullable<typeof order> => order !== null);
        validOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Apply status filter if needed
        let filteredOrders = validOrders;
        if (filter === 'paid') {
            filteredOrders = validOrders.filter(order => order.status === 'Paid');
        } else if (filter === 'unpaid') {
            filteredOrders = validOrders.filter(order => order.status === 'Unpaid');
        }

        return c.json(filteredOrders);

    } catch (error) {
        console.error('Error fetching orders:', error);
        return c.json({ 
            error: 'Failed to fetch orders',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
}

function getPaymentMethodDisplayName(type: string): string {
    switch (type) {
        case 'card':
            return 'Credit Card';
        case 'paypal':
            return 'PayPal';
        case 'sepa_debit':
            return 'SEPA Direct Debit';
        case 'sofort':
            return 'Sofort';
        case 'giropay':
            return 'Giropay';
        case 'ideal':
            return 'iDEAL';
        case 'bancontact':
            return 'Bancontact';
        case 'eps':
            return 'EPS';
        case 'p24':
            return 'Przelewy24';
        case 'link':
            return 'Link';
        default:
            return type.charAt(0).toUpperCase() + type.slice(1);
    }
} 