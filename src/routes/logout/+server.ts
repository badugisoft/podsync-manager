import { redirect, type RequestHandler } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/auth';

function clearSession(cookies: Parameters<RequestHandler>[0]['cookies'], url: URL): never {
  const isHttps = url.protocol === 'https:';

  // 1. 표준 삭제
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps
  });

  // 2. 기본 경로 삭제
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

  // 3. 만료일을 과거로 강제 지정
  cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 0,
    expires: new Date(0)
  });

  throw redirect(303, '/login');
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  clearSession(cookies, url);
};

export const POST: RequestHandler = async ({ cookies, url }) => {
  clearSession(cookies, url);
};
