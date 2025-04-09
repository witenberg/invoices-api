import { createDB, schema } from '../db/db';
import { eq } from 'drizzle-orm';

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
    const invoiceUrl = `${process.env.BASE_URL}/invoices/${invoiceid}`;

    // Placeholder for email sending logic
    console.log(`Attempting to send email for invoice ${invoiceid} to ${client_email}`);
    console.log(`From: ${user_name}`);
    console.log(`Amount: ${currency} ${total.toFixed(2)}`);
    console.log(`View URL: ${invoiceUrl}`);

    // Actual email sending implementation (replace with your provider)
    /*
    const response = await fetch('https://api.emailprovider.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`
      },
      body: JSON.stringify({
        from: `Invoices App <noreply@yourdomain.com>`,
        to: client_email,
        subject: `Invoice #${invoiceid}`,
        html: `
          <h2>Invoice from ${user_name}</h2>
          <p>Hello,</p>
          <p>You have an invoice to pay:</p>
          <ul>
            <li><strong>Invoice Number:</strong> ${invoiceid}</li>
            <li><strong>Amount: </strong>${currency} ${total.toFixed(2)}</li>
          </ul>
          <p>Please click the button below to view your invoice:</p>
          <a href=${invoiceUrl} style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invoice</a>
          <p>Thank you!</p>
          <p>Invoices App Team</p>
        `
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Email API Response Error:', response.status, errorBody);
      throw new Error(`Failed to send email through API. Status: ${response.status}`);
    }
    */

    console.log("Email sending logic simulated.");
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}