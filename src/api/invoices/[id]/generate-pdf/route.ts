import { Context } from 'hono';
import { jsPDF } from 'jspdf';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
    try {
        const id = c.req.param('id');
        
        if (!id) {
            return c.text('Invoice ID not provided', 400);
        }
        
        const db = createDB();
        
        // Fetch invoice
        const invoice = await db.query.invoices.findFirst({
            where: eq(schema.invoices.invoiceid, parseInt(id))
        });

        if (!invoice) {
            return c.text('Invoice not found', 404);
        }

        // Fetch user
        const user = await db.query.users.findFirst({
            where: eq(schema.users.userid, invoice.userid),
            columns: {
                username: true
            }
        });

        if (!user) {
            return c.text('User not found', 404);
        }

        // Fetch client
        const client = await db.query.clients.findFirst({
            where: eq(schema.clients.clientid, invoice.clientid),
            columns: {
                name: true
            }
        });

        if (!client) {
            return c.text('Client not found', 404);
        }

        const { invoiceid, date, currency, products } = invoice;
        const username = user.username;
        const client_name = client.name;

        const total = (products as any[])
            .reduce((sum, product) => {
                const price = parseFloat(product.amount) || 0;
                const quantity = product.quantity || 1;
                return sum + price * quantity;
            }, 0)
            .toFixed(2);

        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        // Set font and colors
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(33, 33, 33);

        // Header
        doc.setFontSize(24);
        doc.text('INVOICE', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`#${invoiceid}`, 20, 30);

        // Sender info
        doc.setFontSize(14);
        doc.text(username, 20, 45);
        
        // Client info
        doc.setFontSize(12);
        doc.text('Bill To:', 20, 60);
        doc.setFontSize(14);
        doc.text(client_name, 20, 70);

        // Invoice details
        doc.setFontSize(12);
        doc.text('Date:', 150, 45);
        doc.text(formattedDate, 150, 55);
        doc.text('Currency:', 150, 65);
        doc.text(currency, 150, 75);

        // Table header
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 90, 170, 10, 'F');
        
        doc.setFontSize(12);
        doc.text('Description', 25, 97);
        doc.text('Quantity', 100, 97);
        doc.text('Price', 130, 97);
        doc.text('Amount', 160, 97);

        // Table content
        let yPosition = 110;
        (products as any[]).forEach((product) => {
            doc.setFontSize(10);
            doc.text(product.name, 25, yPosition);
            doc.text(product.quantity.toString(), 100, yPosition);
            doc.text(parseFloat(product.amount).toFixed(2), 130, yPosition);
            doc.text((parseFloat(product.amount) * product.quantity).toFixed(2), 160, yPosition);
            yPosition += 10;
        });

        // Total
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPosition, 170, 10, 'F');
        
        doc.setFontSize(12);
        doc.text('TOTAL', 25, yPosition + 7);
        doc.text(`${currency} ${total}`, 160, yPosition + 7);

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('Thank you for your business!', 105, 270, { align: 'center' });
        doc.text('Powered by Invoices App', 105, 280, { align: 'center' });

        // Convert to buffer
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Return PDF with appropriate headers
        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${username}-invoice-${invoiceid}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return c.text('Error generating PDF', 500);
    }
}