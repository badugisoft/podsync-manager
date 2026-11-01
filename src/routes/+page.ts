import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  let feeds = [];
  let configPath = '';
  let uptime = '';

  try {
    const [feedsRes, overviewRes] = await Promise.all([
      fetch('/api/feeds'),
      fetch('/api/system/overview')
    ]);

    if (feedsRes.ok) {
      const data = await feedsRes.json();
      feeds = data.feeds || [];
      configPath = data.configPath || '';
    }

    if (overviewRes.ok) {
      const data = await overviewRes.json();
      uptime = data.container?.uptime || '';
    }
  } catch {}

  return {
    configPath,
    uptime,
    feeds
  };
};
