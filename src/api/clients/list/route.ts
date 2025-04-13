import { Context } from "hono";
import { createDB, schema } from "../../../db/db";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(c: Context) {
    try {
        const userId = c.req.query("userId");
        const status = c.req.query("status");

        if (!userId) {
            return c.json({ error: "userId is required" }, 400);
        }

        const db = createDB();
        
        // Pobieramy podstawowe dane klientów
        const clients = await db.select({
            client: schema.clients
        })
        .from(schema.clients)
        .where(
            and(
                eq(schema.clients.userid, parseInt(userId)),
                status ? ilike(schema.clients.name, `%${status}%`) : undefined
            )
        );

        // Pobieramy faktury dla wszystkich klientów
        const invoices = await db.select()
            .from(schema.invoices)
            .where(eq(schema.invoices.userid, parseInt(userId)));

        // Przetwarzamy dane w JavaScript
        const clientsWithStats = clients.map(({ client }) => {
            const clientInvoices = invoices.filter(inv => inv.clientid === client.clientid);
            
            const total_paid = clientInvoices
                .filter(inv => inv.status === 'Paid')
                .reduce((sum, inv) => {
                    const products = inv.products as any[];
                    return sum + products.reduce((s, p) => s + (p.amount * p.quantity), 0);
                }, 0);

            const outstanding = clientInvoices
                .filter(inv => inv.status === 'Sent')
                .reduce((sum, inv) => {
                    const products = inv.products as any[];
                    return products.length;
                    // return sum + products.reduce((s, p) => s + (p.amount * p.quantity), 0);
                }, 0);

            return {
                clientid: client.clientid,
                name: client.name,
                status: client.status,
                currency: client.currency,
                total_paid,
                outstanding,
                invoice_count: clientInvoices.length
            };
        });

        return c.json(clientsWithStats);
    } catch (error) {
        console.error("Error fetching clients:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
}
