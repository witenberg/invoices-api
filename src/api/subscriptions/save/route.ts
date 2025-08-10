import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { getNextSubscriptionDate } from '../../../actions/subscriptions';
import { sendInvoiceEmail } from '../../../actions/email';
import { getCurrentTimestamp, getStartOfDay } from '../../../utils/dateUtils';

export async function POST(c: Context) {
  try {
    const sub = await c.req.json();
    console.log(sub);
    const todayStart = getStartOfDay(getCurrentTimestamp());

    // Validate required fields
    if (!sub.start_date || !sub.frequency || !sub.invoicePrototype) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const db = createDB();
    
    // Validate clientid
    if (!sub.invoicePrototype.clientid) {
      return c.json({ error: "Missing clientid" }, 400);
    }

    // Handle client ID - if it's a public ID, find the UUID
    let clientId = sub.invoicePrototype.clientid;
    console.log('clientId', clientId);
    if (clientId && clientId.startsWith('cli-')) {
      // This is a public ID, find the UUID
      const client = await db.query.clients.findFirst({
        where: eq(schema.clients.publicId, clientId)
      });
      if (client) {
        clientId = client.clientid;
      } else {
        return c.json({ error: "Client not found" }, 404);
      }
    }

    // Validate invoicePrototype.products
    if (!sub.invoicePrototype.products || !Array.isArray(sub.invoicePrototype.products)) {
      return c.json({ error: "Missing or invalid items in invoice prototype" }, 400);
    }
    let subid = sub.subscriptionid ? sub.subscriptionid : undefined;
    const isEditMode = !!subid;
    
    // If we have a public ID, we need to find the actual UUID for database operations
    if (isEditMode && subid && subid.startsWith('sub-')) {
      // This is a public ID, find the UUID
      const existingSubscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.publicId, subid)
      });
      if (existingSubscription) {
        subid = existingSubscription.subscriptionid;
      }
    }
    
    let nextInvoice: Date | null;
    let shouldCreateInvoice = false;

    // Convert date strings to Date objects
    const startDate = new Date(sub.start_date);
    const endDate = sub.end_date ? new Date(sub.end_date) : null;

    // Ustalamy wartość nextInvoice
    if (isEditMode && sub.next_invoice) {
      // W trybie edycji używamy przekazanej wartości next_invoice
      nextInvoice = new Date(sub.next_invoice);
      
      // Jeśli użytkownik ustawił next_invoice na dzisiaj, tworzymy fakturę i aktualizujemy next_invoice
      if (getStartOfDay(nextInvoice).getTime() === todayStart.getTime()) {
        shouldCreateInvoice = true;
        // Aktualizujemy next_invoice na następną datę po dzisiejszej
        const nextDateString = getNextSubscriptionDate(new Date(sub.next_invoice).toISOString().split('T')[0], sub.frequency);
        nextInvoice = new Date(nextDateString);
      }
    } else if (getStartOfDay(startDate).getTime() === todayStart.getTime()) {
      // Dla nowych subskrypcji zaczynających się dzisiaj, ustalamy następną datę
      const nextDateString = getNextSubscriptionDate(new Date(sub.start_date).toISOString().split('T')[0], sub.frequency);
      nextInvoice = new Date(nextDateString);
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
      userid: sub.invoicePrototype.userid,
      clientid: clientId,
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
      products: sub.invoicePrototype.products.map((item: any) => ({
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
        .values(subscriptionData as any)
        .returning({ insertedId: schema.subscriptions.subscriptionid });
      subid = result[0]?.insertedId;
    }

    // Create invoice if needed
    if (shouldCreateInvoice && subid) {
      console.log("Creating invoice with userid:", sub.invoicePrototype.userid, "and clientid:", sub.invoicePrototype.clientid);
      const invoiceData = {
        userid: sub.invoicePrototype.userid,
        clientid: sub.invoicePrototype.clientid,
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
        products: sub.invoicePrototype.products.map((item: any) => ({
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
        .values(invoiceData as any)
        .returning({ insertedId: schema.invoices.invoiceid });

      const invoiceId = invoiceResult[0]?.insertedId;
      if (invoiceId) {
        try {
          await sendInvoiceEmail(invoiceId.toString());
          
          // Set sent_at to current timestamp only if email was sent successfully
          await db.update(schema.invoices)
            .set({ sent_at: getCurrentTimestamp() })
            .where(eq(schema.invoices.invoiceid, invoiceId));
        } catch (emailError) {
          console.error(`Failed to send email for invoice ${invoiceId}:`, emailError);
          // Don't fail the entire subscription creation if email fails
          // The invoice is created but email wasn't sent (sent_at remains null)
        }
      }
    }

    // Get the public ID for the saved subscription
    const savedSubscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.subscriptionid, subid)
    });

    return c.json({ 
      success: true, 
      subscriptionid: savedSubscription?.publicId || subid 
    });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return c.json({ 
        error: "Failed to save subscription",
        details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}



