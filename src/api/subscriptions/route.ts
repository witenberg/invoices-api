import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
  const userId = c.req.query('userId');
  const status = c.req.query('status');

  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }

  try {
    const db = createDB();
    
    // Build the where clause
    const whereClause = [eq(schema.subscriptions.userid, parseInt(userId))];
    if (status) {
      whereClause.push(eq(schema.subscriptions.status, status));
    }
    
    // Fetch subscriptions
    const subscriptions = await db.query.subscriptions.findMany({
      where: and(...whereClause),
      orderBy: (subscriptions, { desc }) => [desc(subscriptions.startDate)]
    });
    
    // Fetch clients for all subscriptions
    const clientIds = subscriptions.map(sub => sub.clientid);
    const clients = await db.query.clients.findMany({
      where: (clients, { inArray }) => inArray(clients.clientid, clientIds),
      columns: {
        clientid: true,
        name: true
      }
    });
    
    // Create a map of client IDs to names for quick lookup
    const clientMap = new Map(clients.map(client => [client.clientid, client.name]));
    
    // Process subscriptions to include client names and calculate totals
    const subscriptionsWithTotal = subscriptions.map(subscription => {
      const products = subscription.products as any[];
      const total = products.reduce((sum, product) => {
        return sum + (Number(product.amount) * (Number(product.quantity) || 1));
      }, 0);
      
      return {
        subscriptionid: subscription.subscriptionid,
        status: subscription.status,
        currency: subscription.currency,
        total: total.toFixed(2),
        client_name: clientMap.get(subscription.clientid) || 'Unknown Client',
        next_invoice: subscription.nextInvoice ? subscription.nextInvoice.toString().split('T')[0] : null,
        frequency: subscription.frequency
      };
    });

    return c.json(subscriptionsWithTotal);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

