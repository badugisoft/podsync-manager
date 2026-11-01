import { redirect, type Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const user = getSessionUser(event);
  if (user) {
    event.locals.user = user;
  }

  const pathname = event.url.pathname;
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/_app');

  if (!event.locals.user && !isPublicRoute) {
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  if (event.locals.user && pathname === '/login') {
    throw redirect(303, '/');
  }

  return resolve(event);
};
