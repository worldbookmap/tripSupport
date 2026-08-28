import { createHash } from 'crypto';

export const AUTH_COOKIE_NAME = 'trip_auth';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function isCorrectPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD ?? '';
  return expected.length > 0 && password === expected;
}

export function authCookieValueFor(password: string): string {
  return hashPassword(password);
}

export function isValidAuthCookie(value: string | undefined): boolean {
  const expected = process.env.APP_PASSWORD ?? '';
  if (!value || !expected) return false;
  return value === hashPassword(expected);
}
