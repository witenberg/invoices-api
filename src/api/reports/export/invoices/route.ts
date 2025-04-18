import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { and, eq, gte, lte } from 'drizzle-orm';

export async function POST(c: Context) {
  const db = createDB();
  const { userId, from, to } = await c.req.json();

  if (!userId || !from || !to) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId, from, to }
    }, 400);
  }

  try {
    const invoices = await db
      .select({
        invoiceid: schema.invoices.invoiceid,
        date: schema.invoices.date,
        status: schema.invoices.status,
        clientName: schema.clients.name,
        products: schema.invoices.products,
        currency: schema.invoices.currency
      })
      .from(schema.invoices)
      .leftJoin(schema.clients, eq(schema.invoices.clientid, schema.clients.clientid))
      .where(
        and(
          eq(schema.invoices.userid, parseInt(userId)),
          gte(schema.invoices.date, from),
          lte(schema.invoices.date, to)
        )
      );

    const headers = 'Invoice ID,Client Name,Date,Total Amount,Currency,Status\n';
    const data = invoices.map(inv => {
      const total = Array.isArray(inv.products) ? inv.products.reduce((sum, product) => {
        const amount = parseFloat(product.amount) || 0;
        const quantity = parseInt(product.quantity) || 1;
        return sum + (amount * quantity);
      }, 0) : 0;

      return `${inv.invoiceid},"${inv.clientName}",${inv.date},${total},${inv.currency},${inv.status}`;
    });

    const csvContent = headers + data.join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices-${from}-to-${to}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error generating invoices CSV:', error);
    return c.json({ error: 'Failed to generate invoices CSV' }, 500);
  }
} 