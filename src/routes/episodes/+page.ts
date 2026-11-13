import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  let episodes = [];
  let feeds = [];

  try {
    const res = await fetch('/api/episodes');
    if (res.ok) {
      const data = await res.json();
      episodes = data.episodes || [];
      feeds = data.feeds || [];
    }
  } catch {}

  return {
    episodes,
    feeds
  };
};
