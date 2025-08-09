import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentTimestamp, getStartOfDay } from '../../utils/dateUtils';
import { sendInvoiceEmail } from '../../actions/email';

export async function POST(c: Context) {
    const todayStart = getStartOfDay(getCurrentTimestamp());
    const todayStartISO = todayStart.toISOString();
    console.log(`[PROCESS_REMINDERS] Starting reminder processing. Today start: ${todayStartISO}`);

    try {
        const db = createDB();
        
        // Find invoices that need reminders - first get all candidates
        console.log(`[PROCESS_REMINDERS] Searching for invoices with reminders enabled...`);
        const candidateInvoices = await db.select()
            .from(schema.invoices)
            .where(
                and(
                    eq(schema.invoices.status, 'Sent'),
                    eq(schema.invoices.enable_reminders, true),
                    isNull(schema.invoices.last_reminder_sent)
                )
            );

        console.log(`[PROCESS_REMINDERS] Found ${candidateInvoices.length} candidate invoices`);

        // Filter invoices based on reminder logic
        const invoices = candidateInvoices.filter(invoice => {
            if (!invoice.payment_date || !invoice.reminder_days_before) {
                return false;
            }
            
            const paymentDate = new Date(invoice.payment_date);
            const reminderDate = new Date(paymentDate);
            reminderDate.setDate(paymentDate.getDate() - invoice.reminder_days_before);
            
            const today = new Date(todayStart);
            
            console.log(`[PROCESS_REMINDERS] Invoice ${invoice.invoiceid}: payment_date=${paymentDate.toISOString()}, reminder_date=${reminderDate.toISOString()}, today=${today.toISOString()}`);
            
            // Check if today is the reminder date
            return reminderDate.toDateString() <= today.toDateString();
        });

        console.log(`[PROCESS_REMINDERS] Found ${invoices.length} invoices that need reminders`);

        if (invoices.length === 0) {
            return c.json({ success: false, message: "No reminders to process today" });
        }

        // Process each invoice
        for (const invoice of invoices) {
            try {
                console.log(`[PROCESS_REMINDERS] Processing invoice ${invoice.invoiceid}, payment_date: ${invoice.payment_date}, reminder_days_before: ${invoice.reminder_days_before}`);
                
                // Send reminder email
                await sendInvoiceEmail(invoice.invoiceid.toString(), true);
                console.log(`[PROCESS_REMINDERS] Email sent for invoice ${invoice.invoiceid}`);
                
                await db.update(schema.invoices)
                    .set({ last_reminder_sent: getCurrentTimestamp() })
                    .where(eq(schema.invoices.invoiceid, invoice.invoiceid));
                    
                console.log(`[PROCESS_REMINDERS] Successfully updated invoice ${invoice.invoiceid}`);
            } catch (error) {
                console.error(`[PROCESS_REMINDERS] Error processing reminder for invoice ${invoice.invoiceid}:`, error);
                // Continue with next invoice even if one fails
            }
        }

        return c.json({ 
            success: true, 
            message: `Processed ${invoices.length} reminders`,
            processedCount: invoices.length
        });

    } catch (error) {
        console.error("[PROCESS_REMINDERS] Error processing reminders:", error);
        return c.json({ 
            error: "Failed to process reminders",
            details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
    }
} 