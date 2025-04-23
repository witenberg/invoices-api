import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { stripe } from '../../../../config/stripe';
import { eq } from 'drizzle-orm';
import { toUTCDateString } from '../../../../utils/dateUtils';

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
    // Check if user exists and has Stripe connected
    const user = await db
      .select({
        stripeConnected: schema.users.stripeConnected,
        stripeAccountid: schema.users.stripeAccountid
      })
      .from(schema.users)
      .where(eq(schema.users.userid, userId))
      .limit(1);

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (!user[0].stripeConnected || !user[0].stripeAccountid) {
      return c.json({ 
        error: 'Payments not enabled. Please enable payments in your settings.' 
      }, 400);
    }

    // Convert dates to timestamps
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to).getTime() / 1000);

    // Fetch transfers from Stripe
    const transfers = await stripe.transfers.list({
      created: {
        gte: fromTimestamp,
        lte: toTimestamp,
      },
      destination: user[0].stripeAccountid,
      limit: 100,
    });

    // Format the data for CSV
    const headers = 'Transfer ID,Amount,Currency,Status,Created,Description,Source Transaction\n';
    const data = transfers.data.map((transfer: any) => {
      const amount = (transfer.amount / 100).toFixed(2); // Convert cents to currency with 2 decimal places
      const date = new Date(transfer.created * 1000).toISOString();
      return `${transfer.id},${amount},${transfer.currency.toUpperCase()},${transfer.status},${date},"${transfer.description || ''}","${transfer.source_transaction || ''}"`;
    });

    const csvContent = headers + data.join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${from}-to-${to}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error generating payments CSV:', error);
    return c.json({ error: 'Failed to generate payments CSV' }, 500);
  }
}
