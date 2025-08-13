import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq, and } from 'drizzle-orm';

export async function GET(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Client ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        const client = await db.query.clients.findFirst({
            where: eq(schema.clients.publicId, id),
        });

        if (!client) {
            return c.json({ error: "Client not found" }, 404);
        }

        // Sprawdzamy czy klient ma faktury ze statusem 'Overdue'
        const overdueInvoices = await db.select()
            .from(schema.invoices)
            .where(
                and(
                    eq(schema.invoices.clientid, client.clientid),
                    eq(schema.invoices.status, 'Overdue')
                )
            );

        const isDelinquent = overdueInvoices.length > 0;

        return c.json({
            publicId: client.publicId,
            userid: client.userid,
            name: client.name,
            email: client.email,
            address: client.address || '',
            currency: client.currency || 'USD',
            language: client.language || 'English',
            status: client.status,
            isDeleted: client.isDeleted || false,
            isDelinquent
        });
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
            .where(eq(schema.clients.publicId, id))
            .returning();

        if (result.length === 0) {
            return c.json({ error: "Client not found" }, 404);
        }

        const updated = result[0];
        return c.json({
            publicId: updated.publicId,
            userid: updated.userid,
            name: updated.name,
            email: updated.email,
            address: updated.address || '',
            currency: updated.currency || 'USD',
            language: updated.language || 'English',
            status: updated.status,
            isDeleted: updated.isDeleted || false
        });
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
            .where(eq(schema.clients.publicId, id))
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