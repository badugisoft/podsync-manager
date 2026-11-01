import crypto from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';

export const SESSION_COOKIE_NAME = 'podsync_session';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const SECRET_KEY = process.env.SESSION_SECRET || 'podsync-default-secret-key-change-in-prod';

export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7일
  const payload = `${username}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export function validateSessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, expiresAtStr, signature] = decoded.split(':');
    if (!username || !expiresAtStr || !signature) {
      return { valid: false };
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) {
      return { valid: false };
    }

    const payload = `${username}:${expiresAtStr}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: true, username };
    }
  } catch {
    // 디코딩 실패 등 예외
  }
  return { valid: false };
}

export function getSessionUser(event: RequestEvent): { username: string } | null {
  const token = event.cookies.get(SESSION_COOKIE_NAME);
  if (!token) return null;

  const result = validateSessionToken(token);
  if (result.valid && result.username) {
    return { username: result.username };
  }
  return null;
}
