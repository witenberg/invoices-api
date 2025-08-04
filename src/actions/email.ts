import { createDB, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { stripe } from '../config/stripe';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface PaymentLinkResponse {
  url: string;
}

export async function sendInvoiceEmail(invoiceid: string, isReminder: boolean = false, paid: boolean = false) {
  try {
    const db = createDB();
    
    // Fetch invoice
    const invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.invoiceid, invoiceid),
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
    console.log("client", client);

    if (!client) {
        console.error('Error fetching related data: Client not found for invoice', invoiceid);
        throw new Error(`Client not found for invoice ID ${invoiceid}`);
    }

    // Fetch user with custom message fields
    const user = await db.query.users.findFirst({
        where: eq(schema.users.userid, invoice.userid),
        columns: {
            username: true,
            stripeConnected: true,
            stripeAccountid: true,
            unpaidMessage: true,
            paidMessage: true
        }
    });

    if (!user) {
        console.error('Error fetching related data: User not found for invoice', invoiceid);
        throw new Error(`User not found for invoice ID ${invoiceid}`);
    }

    const total = Number(invoice.total);
    const client_email = client.email;
    const user_name = user.username;
    const currency = invoice.currency;
    const invoiceUrl = `${process.env.APP_URL}/invoices/${invoiceid}`;
    
    // Get the appropriate message based on paid parameter
    const message = paid 
      ? (user.paidMessage || 'Thank you for your business!') 
      : (user.unpaidMessage || 'Thank you for your business!');

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>', // Replace with your verified domain
      // to: client_email,
      to: 'jakub.witenberg@gmail.com',
      subject: isReminder 
        ? `Payment Reminder: Invoice from ${user_name}` 
        : `Invoice from ${user_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 24px;">Invoice ${invoiceid} to ${client.email}</h2>
          
          <p style="margin-bottom: 16px;">
            An invoice from ${user_name} for ${currency} ${total.toFixed(2)} ${paid ? 'was paid' : 'requires a payment'}.
          </p>
          
          <p style="margin-bottom: 16px;">${message}</p>
          
          <a href="${invoiceUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">View Invoice</a>
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