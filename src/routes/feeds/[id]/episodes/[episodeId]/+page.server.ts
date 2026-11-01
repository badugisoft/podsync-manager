import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadConfig } from '$lib/server/config';
import { fetchFeedEpisodes } from '$lib/server/episodes';

export const load: PageServerLoad = async ({ params }) => {
  const feedId = params.id;
  const episodeId = decodeURIComponent(params.episodeId);

  const { config } = await loadConfig();
  const hostname = config.server?.hostname || 'http://localhost:8080';

  const { channel, episodes } = await fetchFeedEpisodes(hostname, feedId);
  const episode = episodes.find((e) => e.id === episodeId);

  if (!episode) {
    throw error(404, `에피소드 '${episodeId}'를 찾을 수 없습니다.`);
  }

  return {
    feedId,
    channel,
    episode
  };
};
