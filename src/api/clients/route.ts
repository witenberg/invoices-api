import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  const userId = c.req.query('userId');

  if (!userId) {
    return c.json({ error: "User ID is required" }, 400);
  }

  try {
    const db = createDB();
    const clients = await db.query.clients.findMany({
      where: eq(schema.clients.userid, userId),
      orderBy: (clients, { asc }) => [asc(clients.name)]
    });
    
    // Hide internal UUIDs from client list endpoint
    const safeClients = clients.map(client => ({
      publicId: client.publicId,
      userid: client.userid,
      name: client.name,
      email: client.email,
      address: client.address || '',
      currency: client.currency || 'USD',
      language: client.language || 'English',
      status: client.status,
    }));

    return c.json(safeClients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

export async function POST(c: Context) {
  const client = await c.req.json();

  try {
    const db = createDB();
    const result = await db.insert(schema.clients).values({
      userid: client.userId,
      name: client.name,
      email: client.email,
      address: client.address || '',
      currency: client.currency || 'USD',
      language: client.language || 'English'
    } as any).returning({
      publicId: schema.clients.publicId
    });

    return c.json(result[0]);
  } catch (error) {
    console.error("Error creating client:", error);
    return c.json({ error: "Failed to create client" }, 500);
  }
}

