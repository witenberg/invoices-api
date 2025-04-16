import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';

export async function GET(c: Context) {
  const db = createDB();
  const chartType = c.req.query('type');
  const currency = c.req.query('currency');
  const userId = c.req.query('userId');

  if (!userId || !currency || !chartType) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId, currency, chartType }
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
      gte(schema.invoices.date, startDateStr)
    ];

    // Add status filter for payments
    if (chartType === 'payments') {
      conditions.push(eq(schema.invoices.status, 'Paid'));
    }

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
    for (let i = 0; i < 12; i++) {
      const date = subMonths(endDate, i);
      const monthKey = format(date, 'yyyy-MM');
      monthsData.set(monthKey, 0);
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
      }
    });

    // Convert to required format and sort by date
    const sortedEntries = Array.from(monthsData.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const labels = sortedEntries.map(([label]) => label);
    const values = sortedEntries.map(([, value]) => value);

    return c.json({
      labels,
      values,
      currency
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    return c.json({ error: 'Failed to fetch report data' }, 500);
  }
} 