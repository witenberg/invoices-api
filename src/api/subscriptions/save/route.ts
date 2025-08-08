import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { getNextSubscriptionDate } from '../../../actions/subscriptions';
import { sendInvoiceEmail } from '../../../actions/email';
import { getCurrentTimestamp, dateStringToDate, getStartOfDay } from '../../../utils/dateUtils';

export async function POST(c: Context) {
  try {
    const sub = await c.req.json();
    const todayStart = getStartOfDay(getCurrentTimestamp());

    // Validate required fields
    if (!sub.start_date || !sub.frequency || !sub.invoicePrototype) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const db = createDB();
    let subid = sub.subscriptionid ? sub.subscriptionid : undefined;
    const isEditMode = !!subid;
    
    let nextInvoice: Date | null;
    let shouldCreateInvoice = false;

    // Convert date strings to Date objects
    const startDate = dateStringToDate(sub.start_date);
    const endDate = sub.end_date ? dateStringToDate(sub.end_date) : null;

    // Ustalamy wartość nextInvoice
    if (isEditMode && sub.next_invoice) {
      // W trybie edycji używamy przekazanej wartości next_invoice
      nextInvoice = dateStringToDate(sub.next_invoice);
      
      // Jeśli użytkownik ustawił next_invoice na dzisiaj, tworzymy fakturę i aktualizujemy next_invoice
      if (getStartOfDay(nextInvoice).getTime() === todayStart.getTime()) {
        shouldCreateInvoice = true;
        // Aktualizujemy next_invoice na następną datę po dzisiejszej
        const nextDateString = getNextSubscriptionDate(sub.next_invoice, sub.frequency);
        nextInvoice = dateStringToDate(nextDateString);
      }
    } else if (getStartOfDay(startDate).getTime() === todayStart.getTime()) {
      // Dla nowych subskrypcji zaczynających się dzisiaj, ustalamy następną datę
      const nextDateString = getNextSubscriptionDate(sub.start_date, sub.frequency);
      nextInvoice = dateStringToDate(nextDateString);
      shouldCreateInvoice = !isEditMode; // Tylko dla nowych subskrypcji
    } else {
      // Dla nowych subskrypcji zaczynających się w przyszłości, pierwsza faktura to data startowa
      nextInvoice = startDate;
    }

    // Sprawdzamy czy nextInvoice nie jest po endDate
    if (endDate && nextInvoice && nextInvoice > endDate) {
      nextInvoice = null;
      sub.status = 'Paused';
    }

    const subscriptionData = {
      userid: sub.userid,
      clientid: sub.clientid,
      currency: sub.invoicePrototype.currency,
      language: sub.invoicePrototype.language,
      notes: sub.notes || null,
      discount: sub.invoicePrototype.discount ? sub.invoicePrototype.discount.toString() : null,
      salestax: sub.invoicePrototype.salestax?.rate ? sub.invoicePrototype.salestax.rate.toString() : null,
      salestaxname: sub.invoicePrototype.salestax?.name || null,
      secondtax: sub.invoicePrototype.secondtax?.rate ? sub.invoicePrototype.secondtax.rate.toString() : null,
      secondtaxname: sub.invoicePrototype.secondtax?.name || null,
      acceptcreditcards: Boolean(sub.invoicePrototype.acceptcreditcards) || false,
      acceptpaypal: Boolean(sub.invoicePrototype.acceptpaypal) || false,
      startDate: startDate,
      daysToPay: sub.invoicePrototype.daysToPay || null,
      frequency: sub.frequency,
      endDate: endDate,
      status: sub.status,
      nextInvoice: nextInvoice,
      products: sub.invoicePrototype.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: item.amount ? parseFloat(item.amount.toString()) : 0,
        quantity: item.quantity ? parseInt(item.quantity.toString()) : 1
      })),
      total: sub.invoicePrototype.total ? sub.invoicePrototype.total.toString() : null,
      enable_reminders: sub.invoicePrototype.enable_reminders || false,
      reminder_days_before: sub.invoicePrototype.reminder_days_before || null,
    };

    if (subid) {
      // Update existing subscription
      await db.update(schema.subscriptions)
        .set(subscriptionData)
        .where(eq(schema.subscriptions.subscriptionid, subid));
    } else {
      // Create new subscription
      const result = await db.insert(schema.subscriptions)
        .values(subscriptionData)
        .returning({ insertedId: schema.subscriptions.subscriptionid });
      subid = result[0]?.insertedId;
    }

    // Create invoice if needed
    if (shouldCreateInvoice && subid) {
      const invoiceData = {
        userid: sub.userid,
        clientid: sub.clientid,
        status: 'Sent',
        currency: sub.invoicePrototype.currency,
        language: sub.invoicePrototype.language,
        date: getCurrentTimestamp(),
        payment_date: sub.invoicePrototype.daysToPay ? 
          new Date(getCurrentTimestamp().getTime() + sub.invoicePrototype.daysToPay * 24 * 60 * 60 * 1000) : null,
        notes: sub.notes || null,
        discount: sub.invoicePrototype.discount ? sub.invoicePrototype.discount.toString() : null,
        salestax: sub.invoicePrototype.salestax?.rate ? sub.invoicePrototype.salestax.rate.toString() : null,
        salestaxname: sub.invoicePrototype.salestax?.name || null,
        secondtax: sub.invoicePrototype.secondtax?.rate ? sub.invoicePrototype.secondtax.rate.toString() : null,
        secondtaxname: sub.invoicePrototype.secondtax?.name || null,
        acceptcreditcards: Boolean(sub.invoicePrototype.acceptcreditcards) || false,
        acceptpaypal: Boolean(sub.invoicePrototype.acceptpaypal) || false,
        subscriptionid: subid,
        products: sub.invoicePrototype.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          amount: item.amount ? parseFloat(item.amount.toString()) : 0,
          quantity: item.quantity ? parseInt(item.quantity.toString()) : 1
        })),
        total: sub.invoicePrototype.total ? sub.invoicePrototype.total.toString() : null,
        enable_reminders: sub.invoicePrototype.enable_reminders || false,
        reminder_days_before: sub.invoicePrototype.reminder_days_before || null,
      };

      const invoiceResult = await db.insert(schema.invoices)
        .values(invoiceData)
        .returning({ insertedId: schema.invoices.invoiceid });

      const invoiceId = invoiceResult[0]?.insertedId;
      if (invoiceId) {
        await sendInvoiceEmail(invoiceId.toString());
        
        // Set sent_at to current timestamp
        await db.update(schema.invoices)
          .set({ sent_at: getCurrentTimestamp() })
          .where(eq(schema.invoices.invoiceid, invoiceId));
      }
    }

    return c.json({ success: true, subscriptionid: subid });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return c.json({ 
        error: "Failed to save subscription",
        details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}



