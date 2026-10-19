import crypto from 'crypto';
import bcrypt from 'bcrypt';
import settings from '@/config/settings_config';

const config = settings();

// 1. Hash Password (using BCRYPT_SALT_ROUNDS from your .env)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 2. Generate a secure random token for the cookie
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 3. Hash the token before saving to database!
// CRITICAL: If your DB leaks, attackers won't have the raw tokens to hijack sessions.
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}