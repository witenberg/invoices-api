import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const db = createDB();
    const userId = c.req.query('userId');
    const status = c.req.query('status');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Build the query conditions
    const conditions = [eq(schema.salesPages.userid, userId)];
    if (status) {
      conditions.push(eq(schema.salesPages.status, status));
    }

    // Query sales pages with order counts
    const salesPages = await db
      .select({
        salespageid: schema.salesPages.id,
        title: schema.salesPages.title,
        status: schema.salesPages.status,
        currency: schema.salesPages.currency,
        total: schema.salesPages.price,
        frequency: schema.salesPages.frequency,
      })
      .from(schema.salesPages)
      .where(and(...conditions))
      .groupBy(schema.salesPages.id)
      .orderBy(schema.salesPages.id);

    return c.json(salesPages);
  } catch (error) {
    console.error('Error fetching sales pages:', error);
    return c.json({ 
      error: 'Failed to fetch sales pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}
