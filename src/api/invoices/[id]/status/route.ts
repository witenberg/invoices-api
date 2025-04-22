import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Invoice ID not provided" }, 400);
    }

    const db = createDB();
    
    // Fetch invoice with minimum fields
    const invoice = await db.select({
      status: schema.invoices.status,
      invoiceid: schema.invoices.invoiceid
    })
    .from(schema.invoices)
    .where(eq(schema.invoices.invoiceid, parseInt(id)))
    .limit(1);

    if (!invoice || invoice.length === 0) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    return c.json({ 
      status: invoice[0].status,
      isPaid: invoice[0].status === 'Paid'
    });
    
  } catch (error) {
    console.error("Error fetching invoice status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 