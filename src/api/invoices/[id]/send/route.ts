import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';
import { sendInvoiceEmail } from '../../../../actions/email';

export async function POST(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Invoice ID not provided" }, 400);
    }
    
    try {
        // Get request body for reminder flag
        const body = await c.req.json().catch(() => ({}));
        const isReminder = body.isReminder || false;
        
        const emailResult = await sendInvoiceEmail(id, isReminder);

        if (!emailResult.success) {
            return c.json({ 
                error: "Failed to send invoice email" 
            }, 500);
        }

        const db = createDB();
        
        // Update invoice status to 'Sent'
        const updatedInvoice = await db
            .update(schema.invoices)
            .set({ status: 'Sent' })
            .where(eq(schema.invoices.invoiceid, parseInt(id)))
            .returning({ status: schema.invoices.status });

        if (!updatedInvoice || updatedInvoice.length === 0) {
            return c.json({ 
                error: "Failed to update invoice status" 
            }, 500);
        }

        return c.json({ 
            message: "Successfully sent invoice", 
            status: updatedInvoice[0].status 
        }, 200);
    } catch (error) {
        console.error("Error sending invoice:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
}