import { authenticator } from 'otplib';

export class TwoFactorAuth {
  /**
   * Generate a new secret for 2FA
   */
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate QR code URI for Google Authenticator
   */
  static generateQRCodeURI(secret: string, email: string, issuer: string = 'InvoicesApp'): string {
    return authenticator.keyuri(email, issuer, secret);
  }

  /**
   * Verify a TOTP token against a secret
   */
  static verifyToken(token: string, secret: string): boolean {
    try {
      const cleanToken = String(token).trim();
      const cleanSecret = String(secret).trim();
      
      // Sprawdź aktualny czas i poprzednie/następne okna czasowe (±90 sekund)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeSteps = [
        currentTime - 90, // -3 okna (90s wcześniej)
        currentTime - 60, // -2 okna (60s wcześniej)  
        currentTime - 30, // -1 okno (30s wcześniej)
        currentTime,      // aktualne okno
        currentTime + 30, // +1 okno (30s później)
        currentTime + 60, // +2 okna (60s później)
        currentTime + 90  // +3 okna (90s później)
      ];
      
      // Sprawdź każde okno czasowe
      for (let i = 0; i < timeSteps.length; i++) {
        const timeForStep = timeSteps[i];
        
        // Ustaw czas dla authenticator
        const originalTime = Date.now;
        Date.now = () => timeForStep * 1000;
        
        try {
          const generatedToken = authenticator.generate(cleanSecret);
          
          if (generatedToken === cleanToken) {
            Date.now = originalTime; // Przywróć oryginalny czas
            return true;
          }
        } catch (e) {
          // Ignore errors and continue
        }
        
        // Przywróć oryginalny czas
        Date.now = originalTime;
      }
      
      return false;
      
    } catch (error) {
      console.error('TwoFactorAuth.verifyToken error:', error);
      return false;
    }
  }

  /**
   * Generate a manual entry code (formatted secret)
   */
  static formatSecretForManualEntry(secret: string): string {
    // Format as groups of 4 characters separated by spaces
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  /**
   * Generate a backup code (for recovery purposes)
   */
  static generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}