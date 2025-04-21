import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
  const userId = c.req.query('userId');
  const status = c.req.query('status');
  const clientId = c.req.query('clientId');
  console.log(userId, status, clientId);
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
    if (clientId) {
      whereClause.push(eq(schema.subscriptions.clientid, parseInt(clientId)));
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
    
    // Process subscriptions to include client names
    const processedSubscriptions = subscriptions.map(subscription => {
      // Convert total to string safely
      let totalValue = "0.00";
      if (subscription.total !== null && subscription.total !== undefined) {
        // Handle the never type by first checking existence
        totalValue = String(subscription.total);
      }

      // Format next invoice date safely
      let nextInvoiceDate = null;
      if (subscription.nextInvoice) {
        nextInvoiceDate = subscription.nextInvoice.toString().split('T')[0];
      }

      return {
        subscriptionid: subscription.subscriptionid,
        status: subscription.status,
        currency: subscription.currency,
        total: totalValue,
        client_id: subscription.clientid,
        client_name: clientMap.get(subscription.clientid) || 'Unknown Client',
        next_invoice: nextInvoiceDate,
        frequency: subscription.frequency,
        salestaxname: subscription.salestaxname || null,
        secondtaxname: subscription.secondtaxname || null
      };
    });

    return c.json(processedSubscriptions);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

