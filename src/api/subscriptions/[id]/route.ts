import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq, sql } from 'drizzle-orm';

export async function GET(c: Context) {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return c.json({ error: 'Subscription ID not provided' }, 400);
        }
        
        const db = createDB();
        const subscriptionId = parseInt(id);

        // Fetch subscription first
        const subscription = await db.query.subscriptions.findFirst({
            where: eq(schema.subscriptions.subscriptionid, subscriptionId),
        });

        if (!subscription) {
            return c.json({ error: 'Subscription not found' }, 404);
        }

        // Fetch client separately
        const client = await db.query.clients.findFirst({
            where: eq(schema.clients.clientid, subscription.clientid),
            columns: {
                name: true,
                email: true,
                address: true
            }
        });

        // Fetch related invoices count
        const invoiceCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.invoices)
            .where(eq(schema.invoices.subscriptionid, subscriptionId));
        
        const totalInvoices = invoiceCountResult[0]?.count ?? 0;

        // Although unlikely if DB constraints are set, handle missing client case
        if (!client) {
             return c.json({ error: 'Client associated with subscription not found' }, 404);
        }
        
        // Calculate total from products array
        const products = (subscription.products || []) as any[]; // Default to empty array
        const total = products.reduce((sum, product) => {
            // Ensure amount and quantity are treated as numbers for calculation
            const amount = parseFloat(product.amount || '0');
            const quantity = parseInt(product.quantity || '1', 10);
            return sum + (amount * quantity);
        }, 0);

        // Construct the response data, ensuring types match the frontend expectations
        const subData = {
            subscriptionid: subscription.subscriptionid,
            start_date: subscription.startDate, // Already a string YYYY-MM-DD
            frequency: subscription.frequency,
            end_date: subscription.endDate || undefined, // Already a string YYYY-MM-DD or null
            status: subscription.status,
            next_invoice: subscription.nextInvoice || undefined, // Already a string YYYY-MM-DD or null
            currency: subscription.currency,
            language: subscription.language,
            notes: subscription.notes || undefined,
            discount: subscription.discount ? Number(subscription.discount) : undefined,
            salestax: subscription.salestax ? Number(subscription.salestax) : undefined,
            secondtax: subscription.secondtax ? Number(subscription.secondtax) : undefined,
            acceptcreditcards: subscription.acceptcreditcards, // Already boolean
            acceptpaypal: subscription.acceptpaypal, // Already boolean
            client_name: client.name, // Use data from separate client query
            client_email: client.email,
            client_address: client.address || undefined,
            products: products, // Pass the parsed products array
            total: total, // Add calculated total
            total_invoices: totalInvoices // Add invoice count
        };

        return c.json(subData);
    } catch (error) {
        console.error("Error fetching subscription details:", error);
        return c.json(
            { error: "Failed to fetch subscription details" },
            500
        );
    }
}