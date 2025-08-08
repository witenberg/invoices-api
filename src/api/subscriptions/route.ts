import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq, and, or } from 'drizzle-orm';
import { toDateString } from '../../utils/dateUtils';

export async function GET(c: Context) {
  const userId = c.req.query('userId');
  const status = c.req.query('status');
  const clientId = c.req.query('clientId');
  const includeDeleted = c.req.query('includeDeleted') === 'true';
  
  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }

  try {
    const db = createDB();
    
    // Build the where clause
    const whereClause = [eq(schema.subscriptions.userid, userId)];
    
    // Handle special case for Deleted status
    if (status) {
      if (status === 'Deleted') {
        whereClause.push(eq(schema.subscriptions.isDeleted, true));
      } else {
        whereClause.push(eq(schema.subscriptions.status, status));
        if (!includeDeleted) {
          whereClause.push(eq(schema.subscriptions.isDeleted, false));
        }
      }
    } else if (!includeDeleted) {
      // By default, don't include deleted subscriptions
      whereClause.push(eq(schema.subscriptions.isDeleted, false));
    }
    
    if (clientId) {
      whereClause.push(eq(schema.subscriptions.clientid, clientId));
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
        nextInvoiceDate = toDateString(subscription.nextInvoice);
      }

      // If subscription is deleted, show status as "Deleted"
      const displayStatus = subscription.isDeleted ? 'Deleted' : subscription.status;

      return {
        subscriptionid: subscription.subscriptionid,
        status: displayStatus,
        isDeleted: subscription.isDeleted || false,
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

