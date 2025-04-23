import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { getNextSubscriptionDate } from '../../../actions/subscriptions';
import { sendInvoiceEmail } from '../../../actions/email';

export async function POST(c: Context) {
  try {
    const sub = await c.req.json();
    // console.log(sub)
    const today = new Date().toISOString().split("T")[0];

    // Validate required fields
    if (!sub.start_date || !sub.frequency || !sub.invoicePrototype) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const db = createDB();
    let subid = sub.subscriptionid ? sub.subscriptionid : undefined;
    const isEditMode = !!subid;  // Sprawdzamy, czy jest to edycja istniejącej subskrypcji
    
    let nextInvoice: string;
    let shouldCreateInvoice = false;

    // Ustalamy wartość nextInvoice
    if (isEditMode && sub.next_invoice) {
      // W trybie edycji używamy przekazanej wartości next_invoice
      nextInvoice = sub.next_invoice;
      
      // Jeśli użytkownik ustawił next_invoice na dzisiaj, tworzymy fakturę i aktualizujemy next_invoice
      if (nextInvoice === today) {
        shouldCreateInvoice = true;
        // Aktualizujemy next_invoice na następną datę po dzisiejszej
        nextInvoice = getNextSubscriptionDate(today, sub.frequency);
      }
    } else if (sub.start_date === today) {
      // Dla nowych subskrypcji zaczynających się dzisiaj, ustalamy następną datę
      nextInvoice = getNextSubscriptionDate(sub.start_date, sub.frequency);
      shouldCreateInvoice = !isEditMode; // Tylko dla nowych subskrypcji
    } else {
      // Dla nowych subskrypcji zaczynających się w przyszłości, pierwsza faktura to data startowa
      nextInvoice = sub.start_date;
    }

    // Convert products to the format needed for DB storage
    const products = sub.invoicePrototype.products.map((item: any) => ({
      id: item.id,
      name: item.name,
      amount: item.amount ? item.amount.toString() : "0",
      quantity: item.quantity ? item.quantity.toString() : "1"
    }));

    // Calculate total from products
    let subtotal = 0;
    products.forEach((product: any) => {
      const amount = parseFloat(product.amount);
      const quantity = parseInt(product.quantity);
      subtotal += amount * quantity;
    });

    // Apply discount if exists
    const discountRate = sub.invoicePrototype.discount 
      ? parseFloat(sub.invoicePrototype.discount.toString()) / 100 
      : 0;
    let total = subtotal * (1 - discountRate);

    // Apply sales tax if exists
    const salesTaxRate = sub.invoicePrototype.salestax 
      ? parseFloat(sub.invoicePrototype.salestax.toString()) / 100 
      : 0;
    total = total * (1 + salesTaxRate);

    // Apply second tax if exists
    const secondTaxRate = sub.invoicePrototype.secondtax 
      ? parseFloat(sub.invoicePrototype.secondtax.toString()) / 100 
      : 0;
    total = total * (1 + secondTaxRate);

    // Round to 2 decimal places
    total = Math.round(total * 100) / 100;

    // Transform the subscription data to match the database schema
    const subscriptionData = {
      userid: sub.invoicePrototype.userid,
      clientid: sub.invoicePrototype.clientid,
      status: sub.status || 'Active',
      currency: sub.invoicePrototype.currency,
      language: sub.invoicePrototype.language,
      notes: sub.invoicePrototype.notes || null,
      discount: sub.invoicePrototype.discount ? sub.invoicePrototype.discount.toString() : null,
      salestax: sub.invoicePrototype.salestax ? sub.invoicePrototype.salestax.toString() : null,
      salestaxname: sub.invoicePrototype.salestaxname || null,
      secondtax: sub.invoicePrototype.secondtax ? sub.invoicePrototype.secondtax.toString() : null,
      secondtaxname: sub.invoicePrototype.secondtaxname || null,
      acceptcreditcards: Boolean(sub.invoicePrototype.acceptcreditcards),
      acceptpaypal: Boolean(sub.invoicePrototype.acceptpaypal),
      startDate: sub.start_date,
      frequency: sub.frequency,
      endDate: sub.end_date || null,
      nextInvoice: nextInvoice,
      daysToPay: sub.days_to_pay ? sub.days_to_pay.toString() : null,
      products: products,
      total: total.toString()
    };

    let savedSubId: string;
    if (subid) {
      // Update existing subscription
      const updateResult = await db.update(schema.subscriptions)
        .set(subscriptionData)
        .where(eq(schema.subscriptions.subscriptionid, subid))
        .returning({ updatedId: schema.subscriptions.subscriptionid });
      savedSubId = updateResult[0]?.updatedId ?? subid; // Use existing subid if update didn't return one
    } else {
      // Create new subscription
      const insertResult = await db.insert(schema.subscriptions)
        .values(subscriptionData)
        .returning({ insertedId: schema.subscriptions.subscriptionid });
      savedSubId = insertResult[0]?.insertedId;
      if (!savedSubId) {
        throw new Error("Failed to retrieve subscription ID after insertion.");
      }
    }

    // Create and send invoice if needed
    if (shouldCreateInvoice) {
        // Construct invoice data directly
        const invoiceData = {
            userid: subscriptionData.userid,
            clientid: subscriptionData.clientid,
            status: 'Sent', // Set status directly
            currency: subscriptionData.currency,
            language: subscriptionData.language,
            notes: subscriptionData.notes,
            discount: subscriptionData.discount,
            salestax: subscriptionData.salestax,
            salestaxname: subscriptionData.salestaxname,
            secondtax: subscriptionData.secondtax,
            secondtaxname: subscriptionData.secondtaxname,
            acceptcreditcards: subscriptionData.acceptcreditcards,
            acceptpaypal: subscriptionData.acceptpaypal,
            date: today, // Use today's date string
            subscriptionid: savedSubId, // Link to the saved subscription
            products: subscriptionData.products, // Use already formatted products
            total: subscriptionData.total, // Use the same calculated total
            payment_date: subscriptionData.daysToPay ? 
              new Date(new Date(today).getTime() + parseInt(subscriptionData.daysToPay) * 24 * 60 * 60 * 1000)
                .toISOString().split("T")[0] : 
              null
        };

        // Insert invoice directly into the database
        const invoiceResult = await db.insert(schema.invoices)
            .values(invoiceData)
            .returning({ invoiceid: schema.invoices.invoiceid });
        
        const newInvoiceId = invoiceResult[0]?.invoiceid;

        if (newInvoiceId) {
            await sendInvoiceEmail(newInvoiceId.toString());
        } else {
            console.error(`Failed to create or retrieve invoice ID for subscription ${savedSubId}.`);
            // Consider if you want to throw an error here or just log
        }
    }

    return c.json({
      success: true,
      subid: savedSubId, // Return the saved/updated subscription ID
    });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return c.json({
      error: "Failed to save subscription",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}



