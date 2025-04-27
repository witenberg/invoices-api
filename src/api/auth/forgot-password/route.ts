import { Context } from 'hono'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { Resend } from 'resend'
import { createDB } from '../../../db/db'
import { users, emailVerificationTokens } from '../../../db/schema'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(c: Context) {
  try {
    const { email } = await c.req.json()

    const db = createDB();

    if (!email) {
      return c.json({ success: false, message: 'Email is required' }, 400)
    }

    // Check if user exists
    const usersFound = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .execute();

    // Even if user doesn't exist, return success for security reasons
    if (!usersFound || usersFound.length === 0) {
      return c.json({ success: true, message: 'If an account with that email exists, we have sent a password reset link' })
    }

    const user = usersFound[0];
    console.log("User login method:", user.loginMethod);

    // Check if the user used OAuth to sign up
    if (user.loginMethod === 'google') {
      // Special case for Google users - don't send reset email
      return c.json({ 
        success: false, 
        isGoogleUser: true,
        message: 'This account uses Google sign-in. Please sign in with Google instead of using a password.' 
      })
    }

    // Generate a reset token
    const token = randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token valid for 1 hour

    // Delete any existing tokens for this user
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userid, user.userid))
      .execute();

    // Store the reset token in the database
    await db.insert(emailVerificationTokens).values({
      userid: user.userid,
      token,
      expiresAt
    }).execute();

    // Create reset password URL
    const resetUrl = `${process.env.APP_URL}/reset-password/${token}`

    // Send email with reset link
    await resend.emails.send({
      from: 'Invoices App <onboarding@resend.dev>',
      to: user.email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hello ${user.username},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetUrl}" style="background-color: #1882cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>The link will expire in 1 hour.</p>
          <p>Best regards,<br/>The Invoices App Team</p>
        </div>
      `
    })

    return c.json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent a password reset link' 
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return c.json({ success: false, message: 'Something went wrong' }, 500)
  }
}
