import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { stripe } from '../../../config/stripe';
import { eq } from 'drizzle-orm';
import { format, subMonths } from 'date-fns';
import Stripe from 'stripe';

export async function GET(c: Context) {
  const currency = c.req.query('currency');
  const userId = c.req.query('userId');

  if (!userId || !currency) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId, currency }
    }, 400);
  }

  try {
    // Check if user exists and has Stripe connected
    const db = createDB();
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userid, parseInt(userId)))
      .limit(1);

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!user[0].stripeConnected) {
      return c.json({ 
        error: 'Payments not enabled. Please enable payments in your settings.' 
      }, 400);
    }

    // Calculate date range for last 12 months
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    
    // Convert dates to timestamps for Stripe API
    const fromTimestamp = Math.floor(startDate.getTime() / 1000);
    const toTimestamp = Math.floor(endDate.getTime() / 1000);

    // Fetch payments from Stripe
    const payments = await stripe.paymentIntents.list({
      created: {
        gte: fromTimestamp,
        lte: toTimestamp,
      },
      limit: 100,
    });

    // Initialize data structure for 12 months
    const monthsData = new Map();
    const monthsCount = new Map();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(endDate, i);
      const monthKey = format(date, 'yyyy-MM');
      monthsData.set(monthKey, 0);
      monthsCount.set(monthKey, 0);
    }

    // Process each payment and sum up amounts
    payments.data.forEach((payment: Stripe.PaymentIntent) => {
      if (payment.currency === currency) {
        const monthKey = format(new Date(payment.created * 1000), 'yyyy-MM');
        if (monthsData.has(monthKey)) {
          const amount = payment.amount / 100; // Convert from cents to currency
          monthsData.set(monthKey, monthsData.get(monthKey) + amount);
          monthsCount.set(monthKey, monthsCount.get(monthKey) + 1);
        }
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

    // Convert dates to timestamps for Stripe API
    const monthToDateTimestamp = Math.floor(startOfMonth.getTime() / 1000);
    const lastMonthTimestamp = Math.floor(startOfLastMonth.getTime() / 1000);
    const threeMonthsAgoTimestamp = Math.floor(threeMonthsAgo.getTime() / 1000);
    const twelveMonthsAgoTimestamp = Math.floor(twelveMonthsAgo.getTime() / 1000);

    // Fetch statistics from Stripe
    const [monthToDatePayments, lastMonthPayments, lastThreeMonthsPayments, lastTwelveMonthsPayments] = await Promise.all([
      stripe.paymentIntents.list({
        created: { gte: monthToDateTimestamp },
        limit: 100,
      }),
      stripe.paymentIntents.list({
        created: { gte: lastMonthTimestamp, lt: monthToDateTimestamp },
        limit: 100,
      }),
      stripe.paymentIntents.list({
        created: { gte: threeMonthsAgoTimestamp },
        limit: 100,
      }),
      stripe.paymentIntents.list({
        created: { gte: twelveMonthsAgoTimestamp },
        limit: 100,
      })
    ]);

    // Calculate totals for each period
    const calculateTotal = (payments: Stripe.PaymentIntent[]) => {
      return payments
        .filter(p => p.currency === currency)
        .reduce((sum, p) => sum + (p.amount / 100), 0);
    };

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
        monthToDate: calculateTotal(monthToDatePayments.data),
        currentMonth: {
          value: calculateTotal(lastMonthPayments.data),
          month: monthNames[startOfLastMonth.getMonth()],
          year: startOfLastMonth.getFullYear()
        },
        lastThreeMonths: calculateTotal(lastThreeMonthsPayments.data),
        lastTwelveMonths: calculateTotal(lastTwelveMonthsPayments.data),
        allTime: calculateTotal(payments.data),
        currency
      }
    });

  } catch (error) {
    console.error('Error fetching payments data:', error);
    return c.json({ error: 'Failed to fetch payments data' }, 500);
  }
} 