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

    if (!userData.isTwoFactorEnabled || !userData.twoFactorSecret) {
      return c.json({ error: '2FA is not currently enabled for this user' }, 400);
    }
    
    console.log('=== 2FA Disable Debug ===');
    console.log('User ID:', userId);
    console.log('User email:', userData.email);
    console.log('Secret from DB:', userData.twoFactorSecret);
    console.log('2FA Enabled:', userData.isTwoFactorEnabled);
    console.log('Secret type:', typeof userData.twoFactorSecret);
    console.log('Secret length:', userData.twoFactorSecret?.length);
    console.log('Token from request:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token?.length);

    // Verify the token before disabling
    // const isValid = true;
    const isValid = TwoFactorAuth.verifyToken(String(token), userData.twoFactorSecret);
    console.log('Verification result:', isValid);
    console.log('=== End Debug ===');

    if (!isValid) {
      return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
    }

    // Disable 2FA and remove secret
    await db.update(users)
      .set({ 
        isTwoFactorEnabled: false,
        twoFactorSecret: null 
      })
      .where(eq(users.userid, userId));

    return c.json({
      success: true,
      message: '2FA has been successfully disabled for your account'
    });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;