import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
  const userId = c.req.query('userId');
  const status = c.req.query('status');
  const subId = c.req.query('subId') ? parseInt(c.req.query('subId')!) : null;

  console.log(userId, status, subId);

  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }

  try {
    const db = createDB();
    const invoices = await db.select({
      invoice: schema.invoices,
      client: {
        name: schema.clients.name
      }
    })
    .from(schema.invoices)
    .leftJoin(schema.clients, eq(schema.invoices.clientid, schema.clients.clientid))
    .where(and(
      eq(schema.invoices.userid, parseInt(userId)),
      ...(status ? [eq(schema.invoices.status, status)] : []),
      ...(subId ? [eq(schema.invoices.subscriptionid, subId)] : [])
    ))
    .orderBy(schema.invoices.date);

    // Calculate total for each invoice
    const invoicesWithTotal = invoices.map(({ invoice, client }) => {
      const products = invoice.products as any[];
      const total = products.reduce((sum, product) => {
        return sum + (product.amount * product.quantity);
      }, 0);

      return {
        ...invoice,
        client_name: client?.name,
        total
      };
    });

    return c.json(invoicesWithTotal);
  } catch (error) {
    console.error("Error fetching invoices: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

