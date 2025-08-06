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
      return c.json({ error: 'User ID and verification token are required' }, 400);
    }

    // Get user details
    const db = createDB();
    const user = await db.select().from(users).where(eq(users.userid, userId)).limit(1);
    
    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = user[0];

    if (!userData.twoFactorSecret) {
      return c.json({ error: '2FA secret not generated. Please generate first.' }, 400);
    }

    // Verify the token before enabling
    const isValid = TwoFactorAuth.verifyToken(token, userData.twoFactorSecret);

    if (!isValid) {
      return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
    }

    // Enable 2FA for the user
    await db.update(users)
      .set({ isTwoFactorEnabled: true })
      .where(eq(users.userid, userId));

    return c.json({
      success: true,
      message: '2FA has been successfully enabled for your account'
    });

  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;