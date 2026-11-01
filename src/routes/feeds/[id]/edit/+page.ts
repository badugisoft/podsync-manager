import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const feedId = params.id;
  const res = await fetch(`/api/feeds/${encodeURIComponent(feedId)}`);
  if (!res.ok) {
    throw error(404, `피드 '${feedId}'를 찾을 수 없습니다.`);
  }
  const data = await res.json();
  return {
    feedId,
    feed: data.feed
  };
};
