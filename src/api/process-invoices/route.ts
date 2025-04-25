import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const db = createDB();
    
    // Get current date in UTC
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )).toISOString().split('T')[0];

    // Find all invoices with payment_date equal to today and status 'Sent'
    const overdueInvoices = await db.select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.payment_date, todayUTC),
          eq(schema.invoices.status, 'Sent')
        )
      );

    if (overdueInvoices.length === 0) {
      return c.json({
        success: true,
        message: "No overdue invoices found",
        updatedCount: 0
      });
    }

    // Update status of found invoices to 'Overdue'
    const updateResult = await db.update(schema.invoices)
      .set({ status: 'Overdue' })
      .where(
        and(
          eq(schema.invoices.payment_date, todayUTC),
          eq(schema.invoices.status, 'Sent')
        )
      )
      .returning({ invoiceid: schema.invoices.invoiceid });

    return c.json({
      success: true,
      message: `Updated ${updateResult.length} invoices to overdue status`,
      updatedInvoices: updateResult.map((inv: { invoiceid: string }) => inv.invoiceid)
    });

  } catch (error) {
    console.error("Error checking overdue invoices:", error);
    return c.json({
      error: "Failed to check overdue invoices",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
} 