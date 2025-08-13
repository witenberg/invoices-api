import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Client ID not provided" }, 400);
    }

    const db = createDB();
    
    // Fetch client status
    const client = await db.select({
      status: schema.clients.status,
      clientid: schema.clients.clientid,
      isDeleted: schema.clients.isDeleted
    })
    .from(schema.clients)
    .where(eq(schema.clients.publicId, id))
    .limit(1);

    if (!client || client.length === 0) {
      return c.json({ error: "Client not found" }, 404);
    }

    return c.json({ 
      status: client[0].status,
      isDeleted: client[0].isDeleted || false
    });
    
  } catch (error) {
    console.error("Error fetching client status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 

export async function PATCH(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: "Client ID not provided" }, 400);
    }

    const body = await c.req.json();
    const { isDeleted } = body;
    
    if (isDeleted === undefined) {
      return c.json({ error: "isDeleted field is required" }, 400);
    }

    const db = createDB();
    
    // First check if client exists
    const existingClient = await db.select({
      status: schema.clients.status,
      clientid: schema.clients.clientid,
      isDeleted: schema.clients.isDeleted
    })
    .from(schema.clients)
    .where(eq(schema.clients.publicId, id))
    .limit(1);

    if (!existingClient || existingClient.length === 0) {
      return c.json({ error: "Client not found" }, 404);
    }

    // Update the isDeleted flag
    await db.update(schema.clients)
      .set({ isDeleted })
      .where(eq(schema.clients.publicId, id));

    return c.json({ 
      success: true,
      status: existingClient[0].status,
      isDeleted: isDeleted,
      message: isDeleted ? "Client deleted successfully" : "Client restored successfully"
    });
    
  } catch (error) {
    console.error("Error updating client status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

