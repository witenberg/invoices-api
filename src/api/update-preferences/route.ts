import { Context } from 'hono';
import { createDB, schema } from '../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  const { id, currency, language } = await c.req.json();

  try {
    const db = createDB();
    const result = await db.update(schema.users)
      .set({
        defaultCurrency: currency,
        defaultLanguage: language
      })
      .where(eq(schema.users.userid, parseInt(id)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
}
