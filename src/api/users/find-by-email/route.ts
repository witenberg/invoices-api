import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const email = c.req.query('email');

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    });
    console.log("user: ", user);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      userid: user.userid,
      email: user.email,
      password: user.password,
      isverified: user.isverified,
      isTrialActive: user.isTrialActive,
      trialEndDate: user.trialEndDate,
      isSubscriptionActive: user.isSubscriptionActive,
      loginMethod: user.loginMethod,
    });
  } catch (error) {
    console.error("Error finding user:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 