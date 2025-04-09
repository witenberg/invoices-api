import { createDB, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail(invoiceid: string) {
  try {
    const db = createDB();
    
    // Fetch invoice
    const invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.invoiceid, parseInt(invoiceid)),
    });

    if (!invoice) {
      console.error('Error fetching invoice: Invoice not found');
      throw new Error(`Invoice with ID ${invoiceid} not found`);
    }
    
    // Fetch client
    const client = await db.query.clients.findFirst({
        where: eq(schema.clients.clientid, invoice.clientid),
        columns: {
            email: true
        }
    });

    if (!client) {
        console.error('Error fetching related data: Client not found for invoice', invoiceid);
        throw new Error(`Client not found for invoice ID ${invoiceid}`);
    }

    // Fetch user
    const user = await db.query.users.findFirst({
        where: eq(schema.users.userid, invoice.userid),
        columns: {
            username: true
        }
    });

    if (!user) {
        console.error('Error fetching related data: User not found for invoice', invoiceid);
        throw new Error(`User not found for invoice ID ${invoiceid}`);
    }

    const products = invoice.products as any[];
    const total = products.reduce(
      (sum, product) => sum + (parseFloat(product.amount) * (product.quantity || 1)),
      0
    );

    const client_email = client.email;
    const user_name = user.username;
    const currency = invoice.currency;
    const invoiceUrl = `${process.env.APP_URL}/invoices/${invoiceid}`;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>', // Replace with your verified domain
      to: client_email,
      subject: `Invoice #${invoiceid} from ${user_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Invoice from ${user_name}</h2>
          <p>Hello,</p>
          <p>You have received an invoice for payment:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Invoice Number:</strong> ${invoiceid}</p>
            <p><strong>Amount:</strong> ${currency} ${total.toFixed(2)}</p>
          </div>
          <p>Please click the button below to view and pay your invoice:</p>
          <a href="${invoiceUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">View Invoice</a>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you!</p>
          <p>Invoices App Team</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send email through Resend API');
    }

    console.log(`Email sent successfully to ${client_email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}