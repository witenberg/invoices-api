import { Context } from 'hono'
import { createDB, schema } from '../../../db/db'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { hashPassword, verifyPassword } from '../../../utils/password'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(c: Context) {
    const id = c.req.param('id')
    const db = createDB()
    const user = await db.query.users.findFirst({
        where: eq(schema.users.userid, id)
    })

    if (!user) {
        return c.json({ error: 'User not found' }, 404)
    }

    return c.json(user)
}

export async function PUT(c: Context) {
    try {
        const id = c.req.param('id')
        const { username, email, password, currentPassword, resetVerification } = await c.req.json()
        
        const db = createDB()
        const user = await db.query.users.findFirst({
            where: eq(schema.users.userid, id)
        })

        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }

        // Prepare update data
        const updateData: any = {}

        // Update username if provided
        if (username !== undefined) {
            updateData.username = username
        }

        // Update email if provided
        if (email !== undefined) {
            updateData.email = email
        }

        // Handle password update
        if (password) {
            // For verified users, require current password
            if (user.isverified && currentPassword && user.password) {
                // Verify current password
                const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
                if (!isCurrentPasswordValid) {
                    return c.json({ error: 'Current password is incorrect' }, 401)
                }
            }
            
            // Hash new password before saving
            const hashedPassword = await hashPassword(password);
            updateData.password = hashedPassword
        }

        // Reset verification if email changed for verified users
        if (resetVerification && user.isverified) {
            updateData.isverified = false
        }

        // Update user
        await db.update(schema.users)
            .set(updateData)
            .where(eq(schema.users.userid, id))

        // Send verification email if email was changed and user was verified
        if (resetVerification && user.isverified && email) {
            try {
                // Generate verification token
                const token = randomBytes(32).toString('hex')
                const expiresAt = new Date()
                expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

                // Save token to database
                await db.insert(schema.emailVerificationTokens).values({
                    userid: id,
                    token: token,
                    expiresAt: expiresAt
                })

                // Generate verification URL
                const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`

                // Send verification email
                const { data, error } = await resend.emails.send({
                    from: 'Invoices App <onboarding@resend.dev>',
                    to: email,
                    subject: 'Verify your new email address',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                            <h2 style="color: #333;">Email Verification</h2>
                            <p>Hello ${updateData.username || user.username},</p>
                            <p>You recently changed your email address. Please click the button below to verify your new email address:</p>
                            <a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">Verify Email</a>
                            <p>If you did not change your email address, please contact support immediately.</p>
                            <p>This link will expire in 1 hour.</p>
                        </div>
                    `
                })

                if (error) {
                    console.error('Resend API Error:', error)
                    // Don't fail the update, just log the error
                }
            } catch (error) {
                console.error('Error sending verification email:', error)
                // Don't fail the update, just log the error
            }
        }

        return c.json({ success: true, message: 'User updated successfully' })
    } catch (error) {
        console.error('Error updating user:', error)
        return c.json({ error: 'Internal server error' }, 500)
    }
}
