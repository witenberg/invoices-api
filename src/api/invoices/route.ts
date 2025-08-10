import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, isNull, or, SQL } from 'drizzle-orm';

export async function GET(c: Context) {
  const userId = c.req.query('userId');
  const status = c.req.query('status');
  const subId = c.req.query('subId') ? c.req.query('subId') : null;
  const clientId = c.req.query('clientId') ? c.req.query('clientId') : null;
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }

  try {
    const db = createDB();
    
    // Przygotowujemy warunki dla statusu - obsługujemy specjalnie przypadek Deleted
    let statusCondition: any[] = [];
    if (status) {
      if (status === 'Deleted') {
        // Jeśli szukamy usuniętych faktur, używamy flagi isDeleted
        statusCondition = [eq(schema.invoices.isDeleted, true)];
      } else {
        // Dla innych statusów, używamy normalnego filtru i upewniamy się, że faktury nie są usunięte
        statusCondition = [
          eq(schema.invoices.status, status),
          eq(schema.invoices.isDeleted, false)
        ];
      }
    } else if (!includeDeleted) {
      // Jeśli nie szukamy konkretnego statusu i nie chcemy usuniętych, dodajemy warunek
      statusCondition = [eq(schema.invoices.isDeleted, false)];
    }
    
    // Handle subscription ID - if it's a public ID, find the UUID
    let subscriptionId = subId;
    if (subId && subId.includes('-')) {
      // This is a public ID, find the UUID
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.publicId, subId)
      });
      if (subscription) {
        subscriptionId = subscription.subscriptionid;
      }
    }

    const invoices = await db.select({
      invoiceid: schema.invoices.invoiceid,
      publicId: schema.invoices.publicId,
      userid: schema.invoices.userid,
      clientid: schema.invoices.clientid,
      status: schema.invoices.status,
      isDeleted: schema.invoices.isDeleted,
      date: schema.invoices.date,
      currency: schema.invoices.currency,
      subscriptionid: schema.invoices.subscriptionid,
      total: schema.invoices.total,
      client_name: schema.clients.name
    })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientid, schema.clients.clientid))
    .where(and(
      eq(schema.invoices.userid, userId),
      ...(subscriptionId ? [eq(schema.invoices.subscriptionid, subscriptionId)] : []),
      ...(clientId ? [eq(schema.invoices.clientid, clientId)] : []),
      ...statusCondition
    ))
    .orderBy(schema.invoices.date);

    return c.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

