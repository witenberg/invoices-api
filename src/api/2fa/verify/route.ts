import { Hono } from 'hono';
import { createDB } from '../../../db/db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { TwoFactorAuth } from '../../../utils/crypto';

const app = new Hono();

app.post('/', async (c) => {
  try {
    const { userId, token } = await c.req.json();

    if (!userId || !token) {
      return c.json({ error: 'User ID and token are required' }, 400);
    }

    // Get user details
    const db = createDB();
    const user = await db.select().from(users).where(eq(users.userid, userId)).limit(1);
    
    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = user[0];

    if (!userData.twoFactorSecret) {
      return c.json({ error: '2FA not set up for this user' }, 400);
    }

    // Verify the token
    const isValid = TwoFactorAuth.verifyToken(token, userData.twoFactorSecret);

    if (!isValid) {
      return c.json({ error: 'Invalid verification code' }, 400);
    }

    return c.json({
      success: true,
      message: 'Token verified successfully'
    });

  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;