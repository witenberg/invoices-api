import { Context } from 'hono';
import { createDB, schema, relations } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { InvoiceToEdit } from '../../../types/invoice';

export async function GET(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Invoice ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        const invoice = await db.query.invoices.findFirst({
            where: eq(schema.invoices.publicId, id)
        }) as InvoiceToEdit | undefined;

        if (!invoice) {
            return c.json({ error: "Invoice not found" }, 404);
        }
        
        const client = await db.query.clients.findFirst({
        where: eq(schema.clients.clientid, invoice.clientid)
        });

        if (!client) {
            return c.json({ error: "Client not found" }, 404);
        }

        const invoiceData = {
            invoiceid: invoice.invoiceid,
            publicId: invoice.publicId,
            userid: invoice.userid,
            clientid: invoice.clientid,
            status: invoice.status,
            isDeleted: invoice.isDeleted || false,
            currency: invoice.currency,
            language: invoice.language,
            date: invoice.date, // Return UTC timestamp for frontend to format
            payment_date: invoice.payment_date, // Return UTC timestamp for frontend to format
            sent_at: invoice.sent_at, // Return UTC timestamp for frontend to format
            opened_at: invoice.opened_at, // Return UTC timestamp for frontend to format
            notes: invoice.notes || undefined,
            discount: invoice.discount ? Number(invoice.discount) : undefined,
            salestaxname: invoice.salestaxname || undefined,
            salestax: invoice.salestax ? Number(invoice.salestax) : undefined,
            secondtaxname: invoice.secondtaxname || undefined,
            secondtax: invoice.secondtax ? Number(invoice.secondtax) : undefined,
            acceptcreditcards: invoice.acceptcreditcards || false,
            acceptpaypal: invoice.acceptpaypal || false,
            client: {
                name: client.name,
                email: client.email,
                address: client.address || undefined,
            },
            products: invoice.products as any[],
            days_to_pay: invoice.days_to_pay || undefined,
            enable_reminders: invoice.enable_reminders || false,
            reminder_days_before: invoice.reminder_days_before || undefined,
            subscriptionid: invoice.subscriptionid || undefined,
        };

        console.log(invoiceData);
        return c.json(invoiceData);
    } catch (error) {
        console.error("Error fetching invoice: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
}