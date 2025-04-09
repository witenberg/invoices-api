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
      where: eq(schema.clients.userid, parseInt(userId)),
      orderBy: (clients, { asc }) => [asc(clients.name)]
    });
    
    return c.json(clients);
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
      userid: parseInt(client.userId),
      name: client.name,
      email: client.email,
      address: client.address || ''
    }).returning({
      clientid: schema.clients.clientid
    });

    return c.json(result[0]);
  } catch (error) {
    console.error("Error creating client:", error);
    return c.json({ error: "Failed to create client" }, 500);
  }
}

