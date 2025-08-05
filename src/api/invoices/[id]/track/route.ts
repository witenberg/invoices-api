import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq, and } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Invoice ID not provided" }, 400);
    }

    const db = createDB();
    
    // Fetch invoice to check if it exists and if it's already opened
    const invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.invoiceid, id),
      columns: {
        invoiceid: true,
        status: true,
        opened_at: true,
        userid: true
      }
    });

    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    // If invoice is already opened, just redirect or return success without updating
    if (invoice.opened_at) {
      return c.json({ 
        message: "Invoice already tracked",
        openedAt: invoice.opened_at,
        status: invoice.status 
      });
    }

    // Update invoice to mark as opened only if status is "Sent"
    if (invoice.status === 'Sent') {
      const now = new Date();
      
      await db.update(schema.invoices)
        .set({ 
          status: 'Opened',
          opened_at: now
        })
        .where(eq(schema.invoices.invoiceid, id));

      // Log the action
    //   await db.insert(schema.logs).values({
    //     userid: invoice.userid,
    //     action: `Invoice #${id} was opened`,
    //     timestamp: now.toISOString()
    //   });

      return c.json({ 
        message: "Invoice marked as opened",
        openedAt: now.toISOString(),
        status: "Opened"
      });
    }

    // If status is not "Sent", just log the view without changing status
    return c.json({ 
      message: "Invoice view tracked",
      status: invoice.status 
    });

  } catch (error) {
    console.error('Error tracking invoice:', error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}
