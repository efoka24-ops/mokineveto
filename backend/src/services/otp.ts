import { randomInt } from 'node:crypto';
import { config } from '../config.js';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

// Store en mémoire (à remplacer par Redis en production).
const store = new Map<string, OtpRecord>();

export function generateOtp(identifier: string): string {
  const code = randomInt(0, 10 ** config.otp.length)
    .toString()
    .padStart(config.otp.length, '0');
  store.set(identifier, {
    code,
    expiresAt: Date.now() + config.otp.ttlSeconds * 1000,
    attempts: 0,
  });
  return code;
}

export type VerifyResult = 'OK' | 'EXPIRED' | 'INVALID' | 'TOO_MANY_ATTEMPTS' | 'NOT_FOUND';

export function verifyOtp(identifier: string, code: string): VerifyResult {
  const rec = store.get(identifier);
  if (!rec) return 'NOT_FOUND';
  if (Date.now() > rec.expiresAt) {
    store.delete(identifier);
    return 'EXPIRED';
  }
  if (rec.attempts >= config.otp.maxAttempts) {
    store.delete(identifier);
    return 'TOO_MANY_ATTEMPTS';
  }
  if (rec.code !== code) {
    rec.attempts += 1;
    return 'INVALID';
  }
  store.delete(identifier);
  return 'OK';
}
