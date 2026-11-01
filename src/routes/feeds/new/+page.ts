import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
  const cloneFrom = url.searchParams.get('cloneFrom')?.trim().toLowerCase();
  let cloneSourceFeed = null;

  if (cloneFrom) {
    try {
      const res = await fetch(`/api/feeds/${encodeURIComponent(cloneFrom)}`);
      if (res.ok) {
        const json = await res.json();
        cloneSourceFeed = json.feed;
      }
    } catch {}
  }

  return {
    cloneFrom,
    cloneSourceFeed
  };
};
