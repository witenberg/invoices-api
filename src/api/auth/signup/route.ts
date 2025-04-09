import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  try {
    const { username, email, password, login_method } = await c.req.json()

    if (!username || !email || !login_method) {
      return c.json({ error: "Username, email and login method are required" }, 400);
    }

    if (login_method === 'credentials' && !password) {
      return c.json(
        { error: 'Password is required for credentials login' },
        { status: 400 }
      )
    }

    // Sprawdź, czy użytkownik już istnieje
    const db = createDB();
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });

    if (existingUser) {
      return c.json({ error: "User with this email already exists" }, 409);
    }

    // Calculate trial end date (current date + 14 days)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Utwórz nowego użytkownika - hasło jest już zaszyfrowane
    const newUser = await db.insert(schema.users).values({
      username: username,
      email: email,
      loginMethod: login_method,
      password: password,
      trialEndDate: trialEndDate,
      isTrialActive: true
    }).returning();

    return c.json({
      userid: newUser[0].userid,
      email: newUser[0].email,
      isNewUser: true,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
}

