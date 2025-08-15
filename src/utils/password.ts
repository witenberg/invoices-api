// Password hashing utility using Web Crypto API with PBKDF2
const SALT_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations
const KEY_LENGTH = 32; // 256 bits

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    KEY_LENGTH * 8 // Convert bytes to bits
  );
  
  // Convert to base64 for storage
  const hashArray = new Uint8Array(derivedBits);
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  // Return format: salt:hash
  return `${saltBase64}:${hashBase64}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = hash.split(':');
    
    if (!saltBase64 || !hashBase64) {
      return false;
    }
    
    // Decode salt and hash from base64
    const salt = new Uint8Array(atob(saltBase64).split('').map(char => char.charCodeAt(0)));
    const storedHash = new Uint8Array(atob(hashBase64).split('').map(char => char.charCodeAt(0)));
    
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as key
    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive key using same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      key,
      KEY_LENGTH * 8
    );
    
    const computedHash = new Uint8Array(derivedBits);
    
    // Compare hashes
    if (computedHash.length !== storedHash.length) {
      return false;
    }
    
    return computedHash.every((byte, index) => byte === storedHash[index]);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
