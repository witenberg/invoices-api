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
      where: eq(schema.users.userid, id),
      columns: {
        isverified: true
      }
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ isverified: user.isverified });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
} 