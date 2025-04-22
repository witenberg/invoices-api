import { createDB, schema } from '../db/db';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { stripe } from '../config/stripe';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

interface PaymentLinkResponse {
  url: string;
}

export async function sendInvoiceEmail(invoiceid: string, isReminder: boolean = false) {
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
            username: true,
            stripeConnected: true,
            stripeAccountid: true
        }
    });

    if (!user) {
        console.error('Error fetching related data: User not found for invoice', invoiceid);
        throw new Error(`User not found for invoice ID ${invoiceid}`);
    }

    const products = invoice.products as any[];
    const total = Number(invoice.total);

    // Extract discount and tax information if available
    const discount = invoice.discount ? Number(invoice.discount) : 0;
    const salesTax = invoice.salestax ? Number(invoice.salestax) : 0;
    const secondTax = invoice.secondtax ? Number(invoice.secondtax) : 0;
    const salesTaxName = invoice.salestaxname || "Sales Tax";
    const secondTaxName = invoice.secondtaxname || "Additional Tax";

    const client_email = client.email;
    const user_name = user.username;
    const currency = invoice.currency;
    const invoiceUrl = `${process.env.APP_URL}/invoices/${invoiceid}`;

    // Create a summary of invoice items for the description
    const itemsSummary = products.map(product => 
      `${product.name} x${product.quantity || 1}: ${currency} ${(parseFloat(product.amount) * (product.quantity || 1)).toFixed(2)}`
    ).join('\n');

    let paymentUrl = '';
    if (invoice.acceptcreditcards && user.stripeConnected && user.stripeAccountid) {
      try {
        // Create a session with the exact total amount
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(total * 100), // Use exact total amount
              product_data: {
                name: `Invoice #${invoiceid}`,
                description: `Payment for invoice #${invoiceid}\n\n${itemsSummary}${discount > 0 ? `\nDiscount: ${discount}%` : ''}${salesTax > 0 ? `\n${salesTaxName}: ${salesTax}%` : ''}${secondTax > 0 ? `\n${secondTaxName}: ${secondTax}%` : ''}`,
              },
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${process.env.APP_URL}/invoices/${invoiceid}?status=success`,
          cancel_url: `${process.env.APP_URL}/invoices/${invoiceid}?status=cancelled`,
          customer_email: client.email,
          payment_intent_data: {
            transfer_data: {
              destination: user.stripeAccountid,
            },
            metadata: {
              invoiceId: invoiceid.toString(),
              userId: invoice.userid.toString(),
              destinationAccount: user.stripeAccountid,
              discount: discount.toString(),
              salesTax: salesTax.toString(),
              secondTax: secondTax.toString()
            },
          }
        });

        paymentUrl = session.url;
        console.log('Generated Stripe checkout URL:', paymentUrl);
      } catch (error) {
        console.error('Error creating checkout session:', error);
      }
    }

    // Create payment button HTML if payment URL was generated
    const paymentButtonHtml = paymentUrl ? `
      <p>You can pay this invoice directly by clicking the button below:</p>
      <a href="${paymentUrl}" 
         style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">
        Pay Now
      </a>
    ` : '';

    // Create breakdown HTML for taxes and discount if applicable
    // let breakdownHtml = '';
    // if (discount > 0 || salesTax > 0 || secondTax > 0) {
    //   breakdownHtml = `
    //     <div style="font-size: 14px; color: #666; margin-top: 5px;">
    //       ${discount > 0 ? `<p>Includes ${discount}% discount</p>` : ''}
    //       ${salesTax > 0 ? `<p>Includes ${salesTaxName} (${salesTax}%)</p>` : ''}
    //       ${secondTax > 0 ? `<p>Includes ${secondTaxName} (${secondTax}%)</p>` : ''}
    //     </div>
    //   `;
    // }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>', // Replace with your verified domain
      to: client_email,
      subject: isReminder 
        ? `Payment Reminder: Invoice #${invoiceid} from ${user_name}` 
        : `Invoice #${invoiceid} from ${user_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Invoice from ${user_name}</h2>
          <p>Hello,</p>
          ${isReminder 
            ? `<p><strong>This is a friendly reminder</strong> about your pending invoice:</p>`
            : `<p>You have received an invoice for payment:</p>`
          }
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Invoice Number:</strong> ${invoiceid}</p>
            <p><strong>Amount:</strong> ${currency} ${total.toFixed(2)}</p>
          </div>
          ${paymentButtonHtml}
          <p>Please click the button below to view your invoice:</p>
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