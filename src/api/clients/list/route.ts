import { Context } from "hono";
import { createDB, schema } from "../../../db/db";
import { eq, and, ilike, or } from "drizzle-orm";

export async function GET(c: Context) {
    try {
        const userId = c.req.query("userId");
        const status = c.req.query("status");
        const includeDeleted = c.req.query("includeDeleted") === "true";

        if (!userId) {
            return c.json({ error: "userId is required" }, 400);
        }

        const db = createDB();
        
        // Przygotowanie warunków zapytania
        const conditions = [eq(schema.clients.userid, userId)];
        
        // Obsługa trzech przypadków filtrowania:
        // 1. Deleted - zwracamy usunięte
        // 2. Delinquents - zwracamy zalegających (nie usunięte)
        // 3. Default - zwracamy wszystkie nieusunięte
        if (status === "Deleted") {
            // Jeśli szukamy usuniętych klientów
            conditions.push(eq(schema.clients.isDeleted, true));
        } else {
            // W każdym innym przypadku wykluczamy usunięte rekordy
            conditions.push(eq(schema.clients.isDeleted, false));
        }
        
        // Pobieramy podstawowe dane klientów
        const clients = await db.select({
            client: schema.clients
        })
        .from(schema.clients)
        .where(and(...conditions));

        // Pobieramy faktury dla wszystkich klientów
        const invoices = await db.select()
            .from(schema.invoices)
            .where(eq(schema.invoices.userid, userId));

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
                .length;
            
            // Sprawdzamy, czy klient ma faktury ze statusem 'Overdue'
            const hasOverdueInvoices = clientInvoices.some(inv => inv.status === 'Overdue');

            return {
                publicId: client.publicId,
                name: client.name,
                status: client.isDeleted ? "Deleted" : (client.status || "Active"),
                currency: client.currency,
                total_paid,
                outstanding,
                invoice_count: clientInvoices.length,
                isDeleted: client.isDeleted || false,
                isDelinquent: hasOverdueInvoices
            };
        });

        // Jeśli szukamy klientów z zaległościami (Delinquents)
        if (status === "Delinquents") {
            const delinquentClients = clientsWithStats.filter(client => client.isDelinquent);
            return c.json(delinquentClients);
        }

        return c.json(clientsWithStats);
    } catch (error) {
        console.error("Error fetching clients:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
}
