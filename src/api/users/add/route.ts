import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { hashPassword } from '../../../utils/password';

export async function POST(c: Context) {
  try {
    const { name, email, login_method, password } = await c.req.json();

    if (!name || !email || !login_method) {
      return c.json({ error: "Name, email and login method are required" }, 400);
    }

    // Calculate trial end date (current date + 14 days)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    const db = createDB();
    const newUser = await db.insert(schema.users).values({
      username: name,
      email: email,
      loginMethod: login_method,
      password: hashedPassword,
      trialEndDate: trialEndDate,
      isTrialActive: true
    } as any).returning();

    return c.json({
      userid: newUser[0].userid.toString(),
      email: newUser[0].email,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 