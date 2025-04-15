import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(c: Context) {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const db = createDB();
    
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (user.isverified) {
      return c.json({ error: "Email already verified" }, 400);
    }

    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Save token to database
    await db.insert(schema.emailVerificationTokens).values({
      userid: user.userid,
      token: token,
      expiresAt: expiresAt
    });

    // Generate verification URL
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

    // Send verification email
    const { data, error } = await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${user.username},</p>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">Verify Email</a>
          <p>If you did not create an account, you can safely ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API Error:', error);
      return c.json({ error: "Failed to send verification email" }, 500);
    }

    return c.json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 