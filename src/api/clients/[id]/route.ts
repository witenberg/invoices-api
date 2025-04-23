import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Client ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        const client = await db.query.clients.findFirst({
            where: eq(schema.clients.clientid, id),
            // with: {
            //     invoices: true,
            //     subscriptions: true
            // }
        });

        if (!client) {
            return c.json({ error: "Client not found" }, 404);
        }

        return c.json(client);
    } catch (error) {
        console.error("Error fetching client: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
}

export async function PUT(c: Context) {
    const id = c.req.param('id');
    const clientData = await c.req.json();
    
    if (!id) {
        return c.json({ error: "Client ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        const result = await db.update(schema.clients)
            .set({
                name: clientData.name,
                email: clientData.email,
                address: clientData.address || '',
                currency: clientData.currency || 'USD',
                language: clientData.language || 'English'
            })
            .where(eq(schema.clients.clientid, id))
            .returning();

        if (result.length === 0) {
            return c.json({ error: "Client not found" }, 404);
        }

        return c.json(result[0]);
    } catch (error) {
        console.error("Error updating client: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
}

export async function DELETE(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Client ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        const result = await db.delete(schema.clients)
            .where(eq(schema.clients.clientid, id))
            .returning();

        if (result.length === 0) {
            return c.json({ error: "Client not found" }, 404);
        }

        return c.json({ message: "Client deleted successfully" });
    } catch (error) {
        console.error("Error deleting client: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
} 