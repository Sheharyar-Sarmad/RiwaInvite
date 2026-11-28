import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import settings from '@/config/settings_config';

const config = settings();

// 1. Hash Password (using BCRYPT_SALT_ROUNDS from your .env)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

// A real hash, computed once per process. Used so "unknown email" logins cost
// the same bcrypt time as "wrong password" logins.
const BCRYPT_FORMAT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
let dummyHash: Promise<string> | null = null;
const getDummyHash = () =>
  (dummyHash ??= bcrypt.hash("riwainvite-timing-dummy", config.bcryptSaltRounds));

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!BCRYPT_FORMAT.test(hash)) {
    // Malformed/placeholder hash: burn equal time, then reject.
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }
  return bcrypt.compare(password, hash);
}

// 2. Generate a secure random token for the cookie
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 3. Hash the token before saving to database!
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}