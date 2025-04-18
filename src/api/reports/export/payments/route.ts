import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { stripe } from '../../../../config/stripe';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  const db = createDB();
  const { userId, from, to } = await c.req.json();

  console.log(userId, from, to);

  if (!userId || !from || !to) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId, from, to }
    }, 400);
  }

  try {
    // Check if user exists and has Stripe connected
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

    // Convert dates to timestamps
    const fromTimestamp = Math.floor(new Date(from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(to).getTime() / 1000);

    // Fetch payments from Stripe
    const payments = await stripe.paymentIntents.list({
      created: {
        gte: fromTimestamp,
        lte: toTimestamp,
      },
      limit: 100,
    });
    console.log(payments.data);

    // Format the data for CSV
    const headers = 'Payment ID,Amount,Currency,Status,Created,Customer,Description\n';
    const data = payments.data.map((payment: any) => 
      `${payment.id},${payment.amount},${payment.currency},${payment.status},${new Date(payment.created * 1000).toISOString()},"${payment.customer || ''}","${payment.description || ''}"`
    );

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
