import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { and, eq, or, gte, lt } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';
import { sql } from 'drizzle-orm';
import { getCurrentTimestamp, getStartOfDay } from '../../../utils/dateUtils';

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
    
    // Build the base conditions
    const conditions = [
      eq(schema.invoices.userid, userId),
      eq(schema.invoices.currency, currency),
      gte(schema.invoices.date, startDate),
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

    // Helper function to calculate total from products JSONB
    const totalCalculation = sql<number>`
      sum(
        (
          select sum((value->>'amount')::numeric * (value->>'quantity')::numeric)
          from jsonb_array_elements(${schema.invoices.products}) as value
        )
      )`;

    // Get current month total
    const currentMonthResult = await db
      .select({ total: totalCalculation })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.userid, userId),
          eq(schema.invoices.currency, currency),
          gte(schema.invoices.date, startOfMonth),
          or(
            eq(schema.invoices.status, 'Sent'),
            eq(schema.invoices.status, 'Paid')
          )
        )
      );

    // Get last month total
    const lastMonthResult = await db
      .select({ total: totalCalculation })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.userid, userId),
          eq(schema.invoices.currency, currency),
          gte(schema.invoices.date, startOfLastMonth),
          lt(schema.invoices.date, startOfMonth),
          or(
            eq(schema.invoices.status, 'Sent'),
            eq(schema.invoices.status, 'Paid')
          )
        )
      );

    // Get 3 months total
    const threeMonthsResult = await db
      .select({ total: totalCalculation })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.userid, userId),
          eq(schema.invoices.currency, currency),
          gte(schema.invoices.date, threeMonthsAgo),
          or(
            eq(schema.invoices.status, 'Sent'),
            eq(schema.invoices.status, 'Paid')
          )
        )
      );

    // Get 12 months total
    const twelveMonthsResult = await db
      .select({ total: totalCalculation })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.userid, userId),
          eq(schema.invoices.currency, currency),
          gte(schema.invoices.date, twelveMonthsAgo),
          or(
            eq(schema.invoices.status, 'Sent'),
            eq(schema.invoices.status, 'Paid')
          )
        )
      );

    const currentMonthTotal = currentMonthResult[0]?.total || 0;
    const lastMonthTotal = lastMonthResult[0]?.total || 0;
    const threeMonthsTotal = threeMonthsResult[0]?.total || 0;
    const twelveMonthsTotal = twelveMonthsResult[0]?.total || 0;

    return c.json({
      success: true,
      data: {
        labels,
        values,
        counts,
        statistics: {
          currentMonth: currentMonthTotal,
          lastMonth: lastMonthTotal,
          threeMonths: threeMonthsTotal,
          twelveMonths: twelveMonthsTotal
        }
      }
    });

  } catch (error) {
    console.error("Error generating invoice report:", error);
    return c.json({ 
      error: "Failed to generate invoice report",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
} 