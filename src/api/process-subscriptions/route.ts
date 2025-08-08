import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull, lte } from 'drizzle-orm';
import type { SubscriptionFrequency } from '../../types/subscription';
import { getNextSubscriptionDate } from '../../actions/subscriptions';
import { getCurrentTimestamp, getStartOfDay, toDateString } from '../../utils/dateUtils';
import { sendInvoiceEmail } from '../../actions/email';

export async function POST(c: Context) {
    const todayStart = getStartOfDay(getCurrentTimestamp());

    try {
        const db = createDB();
        
        // Find active subscriptions with next_invoice date matching today
        const subscriptions = await db.select()
            .from(schema.subscriptions)
            .where(
                and(
                    lte(schema.subscriptions.nextInvoice, todayStart),
                    eq(schema.subscriptions.status, 'Active')
                )
            );

        if (subscriptions.length === 0) {
            return c.json({ success: false, message: "No subscriptions to process today" });
        }

        // Process each subscription
        for (const subscription of subscriptions) {
            try {
                // Create invoice for this subscription
                const invoiceData = {
                    userid: subscription.userid,
                    clientid: subscription.clientid,
                    status: 'Sent',
                    currency: subscription.currency,
                    language: subscription.language,
                    date: new Date(),
                    payment_date: subscription.daysToPay ? 
                        new Date(new Date().getTime() + subscription.daysToPay * 24 * 60 * 60 * 1000) : null,
                    notes: subscription.notes || null,
                    discount: subscription.discount ? subscription.discount.toString() : null,
                    salestax: subscription.salestax ? subscription.salestax.toString() : null,
                    salestaxname: subscription.salestaxname || null,
                    secondtax: subscription.secondtax ? subscription.secondtax.toString() : null,
                    secondtaxname: subscription.secondtaxname || null,
                    acceptcreditcards: Boolean(subscription.acceptcreditcards) || false,
                    acceptpaypal: Boolean(subscription.acceptpaypal) || false,
                    subscriptionid: subscription.subscriptionid,
                    products: subscription.products,
                    total: subscription.total ? subscription.total.toString() : null,
                    enable_reminders: subscription.enable_reminders || false,
                    reminder_days_before: subscription.reminder_days_before || null,
                };

                const invoiceResult = await db.insert(schema.invoices)
                    .values(invoiceData)
                    .returning({ insertedId: schema.invoices.invoiceid });

                const invoiceId = invoiceResult[0]?.insertedId;
                if (invoiceId) {
                    await sendInvoiceEmail(invoiceId.toString());
                    
                    // Set sent_at to current timestamp
                    await db.update(schema.invoices)
                        .set({ sent_at: new Date() })
                        .where(eq(schema.invoices.invoiceid, invoiceId));
                }

                // Update next_invoice date for the subscription
                if (subscription.nextInvoice) {
                    const nextInvoiceDate = getNextSubscriptionDate(
                        toDateString(subscription.nextInvoice), 
                        subscription.frequency as SubscriptionFrequency
                    );

                    await db.update(schema.subscriptions)
                        .set({ nextInvoice: new Date(nextInvoiceDate) })
                        .where(eq(schema.subscriptions.subscriptionid, subscription.subscriptionid));
                }

            } catch (error) {
                console.error(`Error processing subscription ${subscription.subscriptionid}:`, error);
                // Continue with next subscription even if one fails
            }
        }

        return c.json({ 
            success: true, 
            message: `Processed ${subscriptions.length} subscriptions`,
            processedCount: subscriptions.length
        });

    } catch (error) {
        console.error("Error processing subscriptions:", error);
        return c.json({ 
            error: "Failed to process subscriptions",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
}
