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
      invoiceid: schema.invoices.invoiceid,
      isDeleted: schema.invoices.isDeleted
    })
    .from(schema.invoices)
    .where(eq(schema.invoices.invoiceid, id))
    .limit(1);

    if (!invoice || invoice.length === 0) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    return c.json({ 
      status: invoice[0].status,
      isDeleted: invoice[0].isDeleted,
      isPaid: invoice[0].status === 'Paid'
    });
    
  } catch (error) {
    console.error("Error fetching invoice status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

export async function PATCH(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: "Invoice ID not provided" }, 400);
    }

    const body = await c.req.json();
    const { status, isDeleted } = body;
    
    if (!status && isDeleted === undefined) {
      return c.json({ error: "Either status or isDeleted must be provided" }, 400);
    }

    // Valid status values if status is provided
    if (status) {
      const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'];
      if (!validStatuses.includes(status)) {
        return c.json({ error: "Invalid status value" }, 400);
      }
    }

    const db = createDB();
    
    // First check if invoice exists
    const existingInvoice = await db.select({
      status: schema.invoices.status,
      invoiceid: schema.invoices.invoiceid,
      isDeleted: schema.invoices.isDeleted
    })
    .from(schema.invoices)
    .where(eq(schema.invoices.invoiceid, id))
    .limit(1);

    if (!existingInvoice || existingInvoice.length === 0) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    // Update the invoice status and/or isDeleted flag
    const updateData: any = {};
    if (status) updateData.status = status;
    if (isDeleted !== undefined) updateData.isDeleted = isDeleted;

    await db.update(schema.invoices)
      .set(updateData)
      .where(eq(schema.invoices.invoiceid, id));

    return c.json({ 
      success: true,
      status: status || existingInvoice[0].status,
      isDeleted: isDeleted !== undefined ? isDeleted : existingInvoice[0].isDeleted,
      message: "Invoice updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 