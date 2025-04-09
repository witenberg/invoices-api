import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
    const id = c.req.param('id');
    
    if (!id) {
        return c.json({ error: "Invoice ID not provided" }, 400);
    }
    
    try {
        const db = createDB();
        
        // Fetch invoice
        const invoice = await db.query.invoices.findFirst({
            where: eq(schema.invoices.invoiceid, parseInt(id))
        });

        if (!invoice) {
            return c.json({ error: "Invoice not found" }, 404);
        }
        
        // Fetch user
        const user = await db.query.users.findFirst({
            where: eq(schema.users.userid, invoice.userid),
            columns: {
                username: true
            }
        });
        
        if (!user) {
            return c.json({ error: "User not found" }, 404);
        }
        
        // Fetch client
        const client = await db.query.clients.findFirst({
            where: eq(schema.clients.clientid, invoice.clientid),
            columns: {
                name: true
            }
        });
        
        if (!client) {
            return c.json({ error: "Client not found" }, 404);
        }

        // Calculate total from products array
        const products = (invoice.products as any[]).map((p: any) => ({
            name: p.name,
            amount: p.amount,
            quantity: p.quantity
        }));
        
        const total = products.reduce((sum: number, product: any) => {
            const price = parseFloat(product.amount) || 0;
            const quantity = product.quantity || 1;
            return sum + price * quantity;
        }, 0).toFixed(2);

        // Format date
        const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        const invoiceData = {
            invoiceid: invoice.invoiceid,
            date: invoice.date.toString().split('T')[0],
            formattedDate,
            currency: invoice.currency,
            products,
            total,
            username: user.username,
            client_name: client.name
        };

        return c.json(invoiceData);
    } catch (error) {
        console.error("Error fetching invoice for view: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
} 