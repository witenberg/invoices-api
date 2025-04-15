import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }

    const db = createDB();
    
    // Find token in database
    const verificationToken = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(schema.emailVerificationTokens.token, token),
        gt(schema.emailVerificationTokens.expiresAt, new Date())
      )
    });

    if (!verificationToken) {
      return c.json({ error: "Invalid or expired token" }, 400);
    }

    // Update user's verification status
    await db.update(schema.users)
      .set({ isverified: true })
      .where(eq(schema.users.userid, verificationToken.userid));

    // Delete used token
    await db.delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.tokenid, verificationToken.tokenid));

    return c.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 