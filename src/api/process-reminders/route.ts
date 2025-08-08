import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull, lte, gte, sql } from 'drizzle-orm';
import { getCurrentTimestamp, getStartOfDay, addDaysToDate } from '../../utils/dateUtils';
import { sendInvoiceEmail } from '../../actions/email';

export async function POST(c: Context) {
    const todayStart = getStartOfDay(getCurrentTimestamp());

    try {
        const db = createDB();
        
        // Find invoices that need reminders
        const invoices = await db.select()
            .from(schema.invoices)
            .where(
                and(
                    eq(schema.invoices.status, 'Sent'),
                    eq(schema.invoices.enable_reminders, true),
                    isNull(schema.invoices.last_reminder_sent),
                    gte(schema.invoices.payment_date, todayStart),
                    sql`${schema.invoices.payment_date}::timestamp - ${todayStart}::timestamp = (coalesce(${schema.invoices.reminder_days_before}, 0) * interval '1 day')`
                )
            );

        if (invoices.length === 0) {
            return c.json({ success: false, message: "No reminders to process today" });
        }

        // Process each invoice
        for (const invoice of invoices) {
            try {
                // Send reminder email
                await sendInvoiceEmail(invoice.invoiceid.toString(), true);

                // Update last reminder sent timestamp
                await db.update(schema.invoices)
                    .set({ last_reminder_sent: getCurrentTimestamp() })
                    .where(eq(schema.invoices.invoiceid, invoice.invoiceid));
            } catch (error) {
                console.error(`Error processing reminder for invoice ${invoice.invoiceid}:`, error);
                // Continue with next invoice even if one fails
            }
        }

        return c.json({ 
            success: true, 
            message: `Processed ${invoices.length} reminders`,
            processedCount: invoices.length
        });

    } catch (error) {
        console.error("Error processing reminders:", error);
        return c.json({ 
            error: "Failed to process reminders",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
} 