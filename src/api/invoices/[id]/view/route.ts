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
                username: true,
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

        // Calculate subtotal from products array
        const products = (invoice.products as any[]).map((p: any) => ({
            name: p.name,
            amount: p.amount,
            quantity: p.quantity
        }));
        
        const subtotal = products.reduce((sum: number, product: any) => {
            const price = parseFloat(product.amount) || 0;
            const quantity = product.quantity || 1;
            return sum + price * quantity;
        }, 0);

        // Calculate discount
        const discount = invoice.discount ? parseFloat(invoice.discount.toString()) : 0;
        const discountAmount = (subtotal * discount) / 100;
        const afterDiscount = subtotal - discountAmount;

        // Calculate taxes
        const salestax = invoice.salestax ? parseFloat(invoice.salestax.toString()) : 0;
        const secondtax = invoice.secondtax ? parseFloat(invoice.secondtax.toString()) : 0;
        
        const salestaxAmount = (afterDiscount * salestax) / 100;
        const secondtaxAmount = (afterDiscount * secondtax) / 100;

        // Calculate total
        const total = (afterDiscount + salestaxAmount + secondtaxAmount).toFixed(2);

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
            subtotal: subtotal.toFixed(2),
            discount: discount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            afterDiscount: afterDiscount.toFixed(2),
            salestax: salestax.toFixed(2),
            salestaxAmount: salestaxAmount.toFixed(2),
            salestaxName: invoice.salestaxname || 'TAX',
            secondtax: secondtax.toFixed(2),
            secondtaxAmount: secondtaxAmount.toFixed(2),
            secondtaxName: invoice.secondtaxname || 'SECOND_TAX',
            total,
            userid: invoice.userid,
            username: user.username,
            client_name: client.name,
            acceptcreditcards: invoice.acceptcreditcards
        };

        return c.json(invoiceData);
    } catch (error) {
        console.error("Error fetching invoice for view: ", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
} 