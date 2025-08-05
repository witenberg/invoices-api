import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const id = c.req.query('id');

    if (!id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const db = createDB();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.userid, id)
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    console.log("user: ", user);

    return c.json({
      userid: user.userid,
      username: user.username,
      email: user.email,
      loginMethod: user.loginMethod,
      isverified: user.isverified,
      isTrialActive: user.isTrialActive,
      trialEndDate: user.trialEndDate,
      isSubscriptionActive: user.isSubscriptionActive,
    });
  } catch (error) {
    console.error("Error finding user:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 