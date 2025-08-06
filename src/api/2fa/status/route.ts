import { Hono } from 'hono';
import { createDB } from '../../../db/db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Get user 2FA status
    const db = createDB();
    const user = await db.select({
      isTwoFactorEnabled: users.isTwoFactorEnabled,
      hasSecret: users.twoFactorSecret
    }).from(users).where(eq(users.userid, userId)).limit(1);
    
    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = user[0];

    return c.json({
      success: true,
      data: {
        isEnabled: userData.isTwoFactorEnabled,
        isSetup: !!userData.hasSecret
      }
    });

  } catch (error) {
    console.error('Error getting 2FA status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;