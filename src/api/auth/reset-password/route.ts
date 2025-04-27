import { Context } from 'hono'
import { eq, and, gt } from 'drizzle-orm'
import { createDB } from '../../../db/db'
import { users, emailVerificationTokens, logs } from '../../../db/schema'

export async function POST(c: Context) {
  try {
    const { token, password } = await c.req.json()
    const db = createDB();

    if (!token || !password) {
      return c.json({ success: false, message: 'Token and password are required' }, 400)
    }

    if (password.length < 8) {
      return c.json({ success: false, message: 'Password must be at least 8 characters long' }, 400)
    }

    // Find the verification token that matches and is not expired
    const verificationTokens = await db.select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          gt(emailVerificationTokens.expiresAt, new Date())
        )
      )
      .execute();

    if (!verificationTokens || verificationTokens.length === 0) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 400)
    }

    const verificationToken = verificationTokens[0];

    // Find the user associated with this token
    const usersFound = await db.select()
      .from(users)
      .where(eq(users.userid, verificationToken.userid))
      .execute();

    if (!usersFound || usersFound.length === 0) {
      return c.json({ success: false, message: 'User not found' }, 404)
    }

    const user = usersFound[0];
    console.log("User login method:", user.loginMethod);
    
    // Check if user is using OAuth (should not be able to reset password)
    if (user.loginMethod === 'google') {
      // Delete the verification token
      await db.delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.tokenid, verificationToken.tokenid))
        .execute();
        
      return c.json({ 
        success: false,
        isGoogleUser: true, 
        message: 'This account uses Google sign-in. Please sign in with Google instead of using a password.' 
      }, 400)
    }

    // Update the user's password
    await db.update(users)
      .set({ password: password })
      .where(eq(users.userid, user.userid))
      .execute();

    // Delete the verification token
    await db.delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenid, verificationToken.tokenid))
      .execute();

    // Log the action
    await db.insert(logs).values({
      userid: user.userid,
      action: 'PASSWORD_RESET'
    }).execute();

    return c.json({ success: true, message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('Password reset error:', error)
    return c.json({ success: false, message: 'Something went wrong' }, 500)
  }
} 