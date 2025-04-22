import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull, lte } from 'drizzle-orm';
import type { SubscriptionFrequency } from '../../types/subscription';
import { getNextSubscriptionDate } from '../../actions/subscriptions';
import { getCurrentDateUTC, toUTCDateString } from '../../utils/dateUtils';
import { sendInvoiceEmail } from '../../actions/email';

export async function POST(c: Context) {
    const today_date = getCurrentDateUTC();

    try {
        const db = createDB();
        
        // Find active subscriptions with next_invoice date matching today
        const subscriptions = await db.select()
            .from(schema.subscriptions)
            .where(
                and(
                    eq(schema.subscriptions.nextInvoice, today_date),
                    eq(schema.subscriptions.status, 'Active')
                )
            );

        if (subscriptions.length === 0) {
            return c.json({ success: false, message: "No subscriptions to process today" });
        }

        const formattedSubscriptions = subscriptions.map((sub: any) => {
            return {
                subscriptionid: sub.subscriptionid,
                start_date: sub.startDate.toISOString().split("T")[0],
                frequency: sub.frequency as SubscriptionFrequency,
                next_invoice: sub.nextInvoice ? sub.nextInvoice.toISOString().split("T")[0] : undefined,
                end_date: sub.endDate ? sub.endDate.toISOString().split("T")[0] : undefined,
                invoicePrototype: {
                    userid: sub.userid,
                    clientid: sub.clientid,
                    currency: sub.currency,
                    language: sub.language,
                    notes: sub.notes || undefined,
                    discount: sub.discount ? Number(sub.discount) : undefined,
                    salestax: sub.salestax ? Number(sub.salestax) : undefined,
                    secondtax: sub.secondtax ? Number(sub.secondtax) : undefined,
                    acceptcreditcards: sub.acceptcreditcards,
                    acceptpaypal: sub.acceptpaypal,
                    products: sub.products as any[],
                    client: {
                        name: "",
                        email: "",
                    }
                }
            }
        });

        for (const sub of formattedSubscriptions) {
            // Create invoice using the existing endpoint
            const invoiceData = {
                userid: sub.invoicePrototype.userid,
                clientid: sub.invoicePrototype.clientid,
                status: 'Sent' as const,
                options: {
                    currency: sub.invoicePrototype.currency,
                    language: sub.invoicePrototype.language,
                    date: today_date,
                    notes: sub.invoicePrototype.notes,
                    discount: sub.invoicePrototype.discount,
                    salestax: sub.invoicePrototype.salestax ? { name: "Tax", rate: sub.invoicePrototype.salestax } : undefined,
                    secondtax: sub.invoicePrototype.secondtax ? { name: "Tax 2", rate: sub.invoicePrototype.secondtax } : undefined,
                    acceptcreditcards: sub.invoicePrototype.acceptcreditcards,
                    acceptpaypal: sub.invoicePrototype.acceptpaypal
                },
                items: sub.invoicePrototype.products,
                subscriptionid: sub.subscriptionid
            };

            // Save invoice
            const result = await db.insert(schema.invoices)
                .values({
                    userid: invoiceData.userid,
                    clientid: invoiceData.clientid,
                    status: invoiceData.status,
                    currency: invoiceData.options.currency,
                    language: invoiceData.options.language,
                    date: today_date,
                    notes: invoiceData.options.notes || null,
                    discount: invoiceData.options.discount ? invoiceData.options.discount.toString() : null,
                    salestax: invoiceData.options.salestax?.rate ? invoiceData.options.salestax.rate.toString() : null,
                    secondtax: invoiceData.options.secondtax?.rate ? invoiceData.options.secondtax.rate.toString() : null,
                    acceptcreditcards: Boolean(invoiceData.options.acceptcreditcards) || false,
                    acceptpaypal: Boolean(invoiceData.options.acceptpaypal) || false,
                    subscriptionid: invoiceData.subscriptionid,
                    products: invoiceData.items
                })
                .returning({ insertedId: schema.invoices.invoiceid });

            const invoiceid = result[0]?.insertedId;
            
            if (invoiceid) {
                // Send email
                await sendInvoiceEmail(invoiceid.toString());

                // Calculate next invoice date
                const next_invoice = getNextSubscriptionDate(sub.start_date, sub.frequency);

                // Update subscription
                if (sub.end_date && next_invoice > sub.end_date) {
                    // If next invoice would be after end date, pause the subscription
                    await db.update(schema.subscriptions)
                        .set({ status: 'Paused' })
                        .where(eq(schema.subscriptions.subscriptionid, sub.subscriptionid));
                } else {
                    // Update next invoice date
                    await db.update(schema.subscriptions)
                        .set({ nextInvoice: next_invoice })
                        .where(eq(schema.subscriptions.subscriptionid, sub.subscriptionid));
                }
            }
        }

        return c.json({ success: true, message: "Invoices processed successfully" });
    } catch (error) {
        console.error("Error processing subscriptions:", error);
        return c.json({ error: "Failed to process subscriptions" }, 500);
    }
}
