import { Resend } from 'resend';
import { z } from 'zod';
import { Context, Hono } from 'hono';

export const help = new Hono();

const resend = new Resend(process.env.RESEND_API_KEY);

const supportMessageSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  email: z.string().email().optional(),
});

export async function POST(c: Context) {
  try {
    const body = await c.req.json();
    const result = supportMessageSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Invalid request data', details: result.error.errors }, 400);
    }

    const { subject, message, email } = result.data;

    // Format message with email if provided
    const formattedMessage = email 
      ? `From: ${email}\n\n${message}`
      : message;

    const { data, error } = await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>',
      to: [process.env.SUPPORT_EMAIL!],
      subject: `Support Request: ${subject}`,
      text: formattedMessage,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return c.json(
        { error: 'Failed to send support message' },
        500
      );
    }

    return c.json(
      { message: 'Support message sent successfully' },
      200
    );
  } catch (error) {
    console.error('Error processing support message:', error);
    return c.json(
      { error: 'Failed to process support message' },
      400
    );
  }
};