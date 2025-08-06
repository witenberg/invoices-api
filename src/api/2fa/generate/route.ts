import { Hono } from 'hono';
import { createDB } from '../../../db/db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { TwoFactorAuth } from '../../../utils/crypto';

const app = new Hono();

app.post('/', async (c) => {
  try {
    const { userId } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Get user details
    const db = createDB();
    const user = await db.select().from(users).where(eq(users.userid, userId)).limit(1);
    
    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userData = user[0];

    // Generate new secret
    const secret = TwoFactorAuth.generateSecret();
    
    console.log('=== 2FA Generate Debug ===');
    console.log('Generated secret:', secret);
    console.log('Secret length:', secret.length);
    console.log('Secret type:', typeof secret);
    console.log('=== End Generate Debug ===');
    
    // Generate QR code URI
    const qrCodeURI = TwoFactorAuth.generateQRCodeURI(secret, userData.email, 'InvoicesApp');
    
    // Format secret for manual entry
    const manualEntryCode = TwoFactorAuth.formatSecretForManualEntry(secret);

    // Store the secret temporarily (not enabled yet)
    await db.update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.userid, userId));

    return c.json({
      success: true,
      data: {
        qrCodeURI,
        manualEntryCode,
        secret // We'll remove this in production for security
      }
    });

  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;