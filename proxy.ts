import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, isValidAuthCookie } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (isValidAuthCookie(cookie)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
