import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';
import { toDateString } from '../../../../utils/dateUtils';

// Import existing types from the shared types directory
import type { Subscription, SubscriptionFrequency, SubscriptionStatus } from '../../../../types/subscription';
import type { InvoiceItem } from '../../../../types/invoiceItem';



export async function GET(c: Context) {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return c.json({ error: 'Subscription ID not provided' }, 400);
        }
        
        const db = createDB();
        const subscriptionId = id;

        // Fetch subscription first
        const subscriptionFromDb = await db.query.subscriptions.findFirst({
            where: eq(schema.subscriptions.subscriptionid, subscriptionId),
        });

        if (!subscriptionFromDb) {
            return c.json({ error: 'Subscription not found' }, 404);
        }

        // Fetch client separately
        const clientFromDb = await db.query.clients.findFirst({
            where: eq(schema.clients.clientid, subscriptionFromDb.clientid),
            columns: {
                clientid: true,
                name: true,
                email: true,
                address: true
            }
        });

        if (!clientFromDb) {
             return c.json({ error: 'Client associated with subscription not found' }, 404);
        }
        
        // Parse products (assuming stored as JSON/text)
        const productsFromDb = (subscriptionFromDb.products || []) as any[];
        // Map to the InvoiceItem type expected by the frontend
        const parsedProducts: InvoiceItem[] = productsFromDb.map(p => ({
            id: p.id,
            name: p.name,
            // Convert stored string amounts/quantities back to numbers for the form
            amount: p.amount ? Number(p.amount) : null, 
            quantity: p.quantity ? Number(p.quantity) : undefined
        }));

        // Construct the response data matching the Subscription type structure
        const subDataForEdit: Subscription = {
            subscriptionid: subscriptionFromDb.subscriptionid,
            start_date: toDateString(subscriptionFromDb.startDate), // Convert Date to YYYY-MM-DD string
            days_to_pay: subscriptionFromDb.daysToPay || undefined,
            enable_reminders: subscriptionFromDb.enable_reminders || false,
            reminder_days_before: subscriptionFromDb.reminder_days_before || undefined,
            frequency: subscriptionFromDb.frequency as SubscriptionFrequency,
            end_date: subscriptionFromDb.endDate ? toDateString(subscriptionFromDb.endDate) : undefined, // Convert Date to YYYY-MM-DD string
            status: subscriptionFromDb.status as SubscriptionStatus,
            next_invoice: subscriptionFromDb.nextInvoice ? toDateString(subscriptionFromDb.nextInvoice) : undefined, // Convert Date to YYYY-MM-DD string
            // Construct the invoicePrototype part according to the InvoicePrototype structure
            invoicePrototype: {
                userid: subscriptionFromDb.userid,
                clientid: subscriptionFromDb.clientid,
                currency: subscriptionFromDb.currency,
                language: subscriptionFromDb.language,
                notes: subscriptionFromDb.notes || undefined,
                // Convert DB strings back to numbers for the frontend type
                discount: subscriptionFromDb.discount ? Number(subscriptionFromDb.discount) : undefined,
                salestaxname: subscriptionFromDb.salestaxname || undefined,
                salestax: subscriptionFromDb.salestax ? Number(subscriptionFromDb.salestax) : undefined,
                secondtaxname: subscriptionFromDb.secondtaxname || undefined,
                secondtax: subscriptionFromDb.secondtax ? Number(subscriptionFromDb.secondtax) : undefined,
                acceptcreditcards: subscriptionFromDb.acceptcreditcards,
                acceptpaypal: subscriptionFromDb.acceptpaypal,
                client: { // Nest client data using fetched client info
                    name: clientFromDb.name,
                    email: clientFromDb.email,
                    address: clientFromDb.address || undefined
                },
                products: parsedProducts,
            }
        };

        return c.json(subDataForEdit);
    } catch (error) {
        console.error("Error fetching subscription for edit:", error);
        return c.json(
            { error: "Failed to fetch subscription for edit" },
            500
        );
    }
} 