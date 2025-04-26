import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const db = createDB();
    const userId = c.req.query('userId');
    const status = c.req.query('status');
    const includeDeleted = c.req.query('includeDeleted') === 'true';

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Build the query conditions
    const conditions = [eq(schema.salesPages.userid, userId)];
    
    // Handle status filtering
    if (status) {
      if (status === 'Deleted') {
        // If explicitly requesting deleted items
        conditions.push(eq(schema.salesPages.isDeleted, true));
      } else {
        // For other statuses, add the status condition
        conditions.push(eq(schema.salesPages.status, status));
        // And exclude deleted items unless includeDeleted is true
        if (!includeDeleted) {
          conditions.push(eq(schema.salesPages.isDeleted, false));
        }
      }
    } else if (!includeDeleted) {
      // If no status filter but we don't want deleted items
      conditions.push(eq(schema.salesPages.isDeleted, false));
    }

    // Query sales pages with order counts
    const salesPages = await db
      .select({
        salespageid: schema.salesPages.id,
        title: schema.salesPages.title,
        status: schema.salesPages.status,
        isDeleted: schema.salesPages.isDeleted,
        currency: schema.salesPages.currency,
        total: schema.salesPages.price,
        frequency: schema.salesPages.frequency,
      })
      .from(schema.salesPages)
      .where(and(...conditions))
      .groupBy(schema.salesPages.id)
      .orderBy(schema.salesPages.id);

    // Process results to show correct status for deleted pages
    const processedSalesPages = salesPages.map(page => ({
      ...page,
      isDeleted: page.isDeleted || false,
      status: page.isDeleted ? 'Deleted' : page.status
    }));

    return c.json(processedSalesPages);
  } catch (error) {
    console.error('Error fetching sales pages:', error);
    return c.json({ 
      error: 'Failed to fetch sales pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}
