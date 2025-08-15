import { Context } from 'hono';
import { jwtVerify } from 'jose';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';
import { TwoFactorAuth } from '../../../utils/crypto';
import { verifyPassword } from '../../../utils/password';


export async function POST(c: Context) {
  try {
    const { email, password, twoFactorCode, skipTwoFactor } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    // Znajdź użytkownika po emailu
    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (!user.password) {
      return c.json({ error: "Invalid login method" }, 400);
    }

    try {
      // Verify password using PBKDF2 hash
      const isMatch = await verifyPassword(password, user.password);

      if (!isMatch) {
        return c.json({ error: "Invalid password" }, 401);
      }

      // Check if 2FA is enabled for this user
      if (user.isTwoFactorEnabled && user.twoFactorSecret && !skipTwoFactor) {
        if (!twoFactorCode) {
          return c.json({ 
            error: "2FA code required", 
            requiresTwoFactor: true,
            userid: user.userid
          }, 400);
        }

        // Verify 2FA code
        const is2FAValid = TwoFactorAuth.verifyToken(twoFactorCode, user.twoFactorSecret);
        
        if (!is2FAValid) {
          return c.json({ error: "Invalid 2FA code" }, 401);
        }
      }

      return c.json({
        userid: user.userid,
        email: user.email,
        isNewUser: false,
        isVerified: user.isverified,
        isTrialActive: user.isTrialActive,
        trialEndDate: user.trialEndDate,
        isSubscriptionActive: user.isSubscriptionActive,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
      });
    } catch (error) {
      console.error("Password verification failed:", error);
      return c.json({ error: "Password verification failed" }, 401);
    }
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

