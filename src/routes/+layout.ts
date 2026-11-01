import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = async ({ fetch, url }) => {
  const isLoginPage = url.pathname.startsWith('/login');

  let me: { authenticated: boolean; username?: string } = { authenticated: false };
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      me = await res.json();
    }
  } catch {
    // network error or backend offline
  }

  if (!me.authenticated && !isLoginPage) {
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }

  if (me.authenticated && isLoginPage) {
    throw redirect(303, '/');
  }

  if (!me.authenticated) {
    return {
      user: null,
      container: { name: 'podsync', status: 'unknown' },
      hasPendingChanges: false,
      hostname: 'http://localhost:8080'
    };
  }

  // Load system overview and config for authenticated session
  let container = { name: 'podsync', status: 'unknown', uptime: '' };
  let hasPendingChanges = false;
  let hostname = 'http://localhost:8080';

  try {
    const [overviewRes, configRes] = await Promise.all([
      fetch('/api/system/overview'),
      fetch('/api/config')
    ]);

    if (overviewRes.ok) {
      const overview = await overviewRes.json();
      container = overview.container;
      hasPendingChanges = overview.hasChanges;
    }

    if (configRes.ok) {
      const cfgData = await configRes.json();
      if (cfgData.config?.server?.hostname) {
        hostname = cfgData.config.server.hostname;
      }
    }
  } catch {
    // fallback defaults
  }

  return {
    user: { username: me.username },
    container,
    hasPendingChanges,
    hostname
  };
};
