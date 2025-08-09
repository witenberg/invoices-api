import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull, lte } from 'drizzle-orm';
import type { SubscriptionFrequency } from '../../types/subscription';
import { getNextSubscriptionDate } from '../../actions/subscriptions';
import { getCurrentTimestamp, getStartOfDay, toDateString, dateStringToUTCTimestamp, getStartOfDayUTC } from '../../utils/dateUtils';
import { sendInvoiceEmail } from '../../actions/email';

export async function POST(c: Context) {
    // Use UTC time for consistent comparison with database timestamps
    const todayStart = getStartOfDayUTC(getCurrentTimestamp());
    
    console.log(`Processing subscriptions - todayStart: ${todayStart.toISOString()}`);

    try {
        const db = createDB();
        
        // Find active subscriptions with next_invoice date that is today or in the past
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
                    
                    // Convert the date string to proper UTC timestamp for database storage
                    const nextInvoiceTimestamp = dateStringToUTCTimestamp(nextInvoiceDate);
                    
                    console.log(`old date: ${subscription.nextInvoice}, new date: ${nextInvoiceDate}, new timestamp: ${nextInvoiceTimestamp}`);

                    // Check if the new nextInvoice date exceeds the subscription's end date
                    if (subscription.endDate && nextInvoiceTimestamp > subscription.endDate) {
                        // If next invoice would be after end date, pause the subscription
                        console.log(`Subscription ${subscription.subscriptionid} ended - pausing (endDate: ${subscription.endDate})`);
                        
                        await db.update(schema.subscriptions)
                            .set({ 
                                status: 'Paused',
                                nextInvoice: null // Clear next invoice since subscription is paused
                            })
                            .where(eq(schema.subscriptions.subscriptionid, subscription.subscriptionid));
                    } else {
                        // Update next invoice date normally
                        await db.update(schema.subscriptions)
                            .set({ nextInvoice: nextInvoiceTimestamp })
                            .where(eq(schema.subscriptions.subscriptionid, subscription.subscriptionid));
                    }
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
