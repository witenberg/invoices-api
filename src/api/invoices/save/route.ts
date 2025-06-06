import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import type { Invoice } from '../../../types/invoice';
import { InvoiceItem } from '../../../types/invoiceItem';
import { sendInvoiceEmail } from '../../../actions/email';
import { getCurrentDateUTC, toUTCDateString } from '../../../utils/dateUtils';

export async function POST(c: Context) {
  try {
    const invoice = await c.req.json<Invoice>();

    const db = createDB();
    let invoiceid = invoice.invoiceid ? invoice.invoiceid : undefined;

    // Calculate total amount from products
    let subtotal = 0;
    invoice.items.forEach((item: InvoiceItem) => {
      const amount = item.amount ? parseFloat(item.amount.toString()) : 0;
      const quantity = item.quantity ? parseInt(item.quantity.toString()) : 1;
      subtotal += amount * quantity;
    });

    // Apply discount if exists
    const discountRate = invoice.options.discount ? parseFloat(invoice.options.discount.toString()) / 100 : 0;
    let total = subtotal * (1 - discountRate);

    // Apply sales tax if exists
    const salesTaxRate = invoice.options.salestax?.rate ? parseFloat(invoice.options.salestax.rate.toString()) / 100 : 0;
    total = total * (1 + salesTaxRate);

    // Apply second tax if exists
    const secondTaxRate = invoice.options.secondtax?.rate ? parseFloat(invoice.options.secondtax.rate.toString()) / 100 : 0;
    total = total * (1 + secondTaxRate);

    // Round to 2 decimal places
    total = Math.round(total * 100) / 100;

    const invoiceData = {
      userid: invoice.userid,
      clientid: invoice.clientid,
      status: invoice.status,
      currency: invoice.options.currency,
      language: invoice.options.language,
      date: invoice.options.date ? toUTCDateString(invoice.options.date) : getCurrentDateUTC(),
      payment_date: invoice.options.payment_date ? toUTCDateString(invoice.options.payment_date) : null,
      notes: invoice.options.notes || null,
      discount: invoice.options.discount ? invoice.options.discount.toString() : null,
      salestax: invoice.options.salestax?.rate ? invoice.options.salestax.rate.toString() : null,
      salestaxname: invoice.options.salestax?.name || null,
      secondtax: invoice.options.secondtax?.rate ? invoice.options.secondtax.rate.toString() : null,
      secondtaxname: invoice.options.secondtax?.name || null,
      acceptcreditcards: Boolean(invoice.options.acceptcreditcards) || false,
      acceptpaypal: Boolean(invoice.options.acceptpaypal) || false,
      subscriptionid: invoice.subscriptionid ? invoice.subscriptionid : null,
      products: invoice.items.map((item: InvoiceItem) => ({
        id: item.id,
        name: item.name,
        amount: item.amount ? parseFloat(item.amount.toString()) : 0,
        quantity: item.quantity ? parseInt(item.quantity.toString()) : 1
      })),
      total: total.toString(),
      enable_reminders: invoice.options.enable_reminders || false,
      reminder_days_before: invoice.options.reminder_days_before || null,
    };

    let savedInvoiceId: string | undefined = invoiceid;

    if (invoiceid) {
      // Update existing invoice
      await db.update(schema.invoices)
        .set(invoiceData)
        .where(eq(schema.invoices.invoiceid, invoiceid));
    } else {
      // Create new invoice
      const result = await db.insert(schema.invoices)
        .values(invoiceData)
        .returning({ insertedId: schema.invoices.invoiceid });
      savedInvoiceId = result[0]?.insertedId;
      if (!savedInvoiceId) {
        throw new Error("Failed to retrieve invoice ID after insertion.");
      }
    }

    const currentDate = getCurrentDateUTC();
    // Only send email for new invoices being sent, not for updates
    if (invoice.options.date === currentDate && savedInvoiceId && invoice.status === 'Sent' && !invoiceid) {
      await sendInvoiceEmail(savedInvoiceId.toString());
    }

    return c.json({ success: true, invoiceid: savedInvoiceId });
  } catch (error) {
    console.error("Error saving invoice:", error);
    return c.json({ 
        error: "Failed to save invoice",
        details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}

