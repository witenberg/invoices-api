import { Context } from 'hono';
import { jwtVerify } from 'jose';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function POST(c: Context) {
  try {
    const { email, password } = await c.req.json();

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
      // Hasło jest już zaszyfrowane, więc porównujemy je bezpośrednio
      const isMatch = password === user.password;

      if (isMatch) {
        return c.json({
          userid: user.userid,
          email: user.email,
          isNewUser: false,
          isVerified: user.isverified,
          isTrialActive: user.isTrialActive,
          trialEndDate: user.trialEndDate,
          isSubscriptionActive: user.isSubscriptionActive,
        });
      } else {
        return c.json({ error: "Invalid password" }, 401);
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      return c.json({ error: "Password verification failed" }, 401);
    }
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

