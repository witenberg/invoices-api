import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { and, eq, or, gte } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';
import { sql } from 'drizzle-orm';

export async function GET(c: Context) {
  const db = createDB();
  const currency = c.req.query('currency');
  const userId = c.req.query('userId');

  if (!userId || !currency) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId, currency }
    }, 400);
  }

  try {
    // Calculate date range for last 12 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    
    // Format dates as YYYY-MM-DD strings
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    
    // Build the base conditions
    const conditions = [
      eq(schema.invoices.userid, parseInt(userId)),
      eq(schema.invoices.currency, currency),
      gte(schema.invoices.date, startDateStr),
      or(
        eq(schema.invoices.status, 'Sent'),
        eq(schema.invoices.status, 'Paid')
      )
    ];

    // Query invoices for the last 12 months
    const invoices = await db
      .select({
        date: schema.invoices.date,
        products: schema.invoices.products,
        currency: schema.invoices.currency
      })
      .from(schema.invoices)
      .where(and(...conditions));

    // Initialize data structure for 12 months
    const monthsData = new Map();
    const monthsCount = new Map();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(endDate, i);
      const monthKey = format(date, 'yyyy-MM');
      monthsData.set(monthKey, 0);
      monthsCount.set(monthKey, 0);
    }

    // Process each invoice and sum up product values
    invoices.forEach(invoice => {
      const monthKey = format(new Date(invoice.date), 'yyyy-MM');
      if (monthsData.has(monthKey)) {
        const products = Array.isArray(invoice.products) ? invoice.products : [];
        const total = products.reduce((sum, product) => {
          const amount = parseFloat(product.amount) || 0;
          const quantity = parseInt(product.quantity) || 1;
          return sum + (amount * quantity);
        }, 0);
        monthsData.set(monthKey, monthsData.get(monthKey) + total);
        monthsCount.set(monthKey, monthsCount.get(monthKey) + 1);
      }
    });

    // Convert to required format and sort by date
    const sortedEntries = Array.from(monthsData.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const labels = sortedEntries.map(([label]) => label);
    const values = sortedEntries.map(([, value]) => value);
    const counts = sortedEntries.map(([label]) => monthsCount.get(label) || 0);

    // Calculate statistics
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
      chart: {
        labels,
        values,
        counts,
        currency
      },
      statistics: {
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
      }
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    return c.json({ error: 'Failed to fetch report data' }, 500);
  }
} 