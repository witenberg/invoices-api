import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { sql } from 'drizzle-orm';

export async function GET(c: Context) {
  const db = createDB();
  const currency = c.req.query('currency');
  const userId = c.req.query('userId');

  if (!userId || !currency) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    const twelveMonthsAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);

    // Convert dates to ISO strings for PostgreSQL
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const startOfLastMonthStr = startOfLastMonth.toISOString().split('T')[0];
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];

    // Helper function to calculate total from products JSONB
    const totalCalculation = sql<number>`
      sum(
        (
          select sum((value->>'amount')::numeric * (value->>'quantity')::numeric)
          from jsonb_array_elements(${schema.invoices.products}) as value
        )
      )`;

    // Month to date
    const monthToDate = await db
      .select({
        total: totalCalculation
      })
      .from(schema.invoices)
      .where(sql`${schema.invoices.userid}::text = ${userId}
        AND ${schema.invoices.currency} = ${currency}
        AND ${schema.invoices.date} >= ${startOfMonthStr}`);

    // Current month (full)
    const currentMonth = await db
      .select({
        total: totalCalculation
      })
      .from(schema.invoices)
      .where(sql`${schema.invoices.userid}::text = ${userId}
        AND ${schema.invoices.currency} = ${currency}
        AND ${schema.invoices.date} >= ${startOfLastMonthStr}
        AND ${schema.invoices.date} < ${startOfMonthStr}`);

    // Last 3 months
    const lastThreeMonths = await db
      .select({
        total: totalCalculation
      })
      .from(schema.invoices)
      .where(sql`${schema.invoices.userid}::text = ${userId}
        AND ${schema.invoices.currency} = ${currency}
        AND ${schema.invoices.date} >= ${threeMonthsAgoStr}`);

    // Last 12 months
    const lastTwelveMonths = await db
      .select({
        total: totalCalculation
      })
      .from(schema.invoices)
      .where(sql`${schema.invoices.userid}::text = ${userId}
        AND ${schema.invoices.currency} = ${currency}
        AND ${schema.invoices.date} >= ${twelveMonthsAgoStr}`);

    // All time
    const allTime = await db
      .select({
        total: totalCalculation
      })
      .from(schema.invoices)
      .where(sql`${schema.invoices.userid}::text = ${userId}
        AND ${schema.invoices.currency} = ${currency}`);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return c.json({
      monthToDate: Number(monthToDate[0]?.total || 0),
      currentMonth: {
        value: Number(currentMonth[0]?.total || 0),
        month: monthNames[startOfLastMonth.getMonth()],
        year: startOfLastMonth.getFullYear()
      },
      lastThreeMonths: Number(lastThreeMonths[0]?.total || 0),
      lastTwelveMonths: Number(lastTwelveMonths[0]?.total || 0),
      allTime: Number(allTime[0]?.total || 0),
      currency
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
} 