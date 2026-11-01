import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const feedId = params.id;
  const episodeId = decodeURIComponent(params.episodeId);

  const res = await fetch(`/api/feeds/${encodeURIComponent(feedId)}/episodes`);
  if (!res.ok) {
    throw error(404, `에피소드 '${episodeId}'를 찾을 수 없습니다.`);
  }

  const data = await res.json();
  const episode = (data.episodes || []).find((e: { id: string }) => e.id === episodeId);
  if (!episode) {
    throw error(404, `에피소드 '${episodeId}'를 찾을 수 없습니다.`);
  }

  return {
    feedId,
    channel: data.channel,
    episode
  };
};
