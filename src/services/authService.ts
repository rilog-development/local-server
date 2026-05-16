import crypto from 'crypto';
import { config } from '../config';

const tokens = new Set<string>();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(input: string): boolean {
  const configured = config.auth.password;
  if (!configured) return false;
  try {
    const a = Buffer.from(input);
    const b = Buffer.from(configured);
    // Pad shorter buffer so timingSafeEqual doesn't throw on length mismatch
    const len = Math.max(a.length, b.length);
    const pa = Buffer.concat([a, Buffer.alloc(len - a.length)]);
    const pb = Buffer.concat([b, Buffer.alloc(len - b.length)]);
    return crypto.timingSafeEqual(pa, pb) && a.length === b.length;
  } catch {
    return false;
  }
}

function createToken(): string {
  const token = generateToken();
  tokens.add(token);
  return token;
}

function isValidToken(token: string): boolean {
  return tokens.has(token);
}

function revokeToken(token: string): void {
  tokens.delete(token);
}

export const authService = { verifyPassword, createToken, isValidToken, revokeToken };
