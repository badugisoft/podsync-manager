import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFeed, deleteFeed, loadConfig } from '$lib/server/config';
import { getPodsyncStatus } from '$lib/server/docker';
import { fetchFeedEpisodes } from '$lib/server/episodes';

export const load: PageServerLoad = async ({ params }) => {
  const feedId = params.id;
  const feed = await getFeed(feedId);

  if (!feed) {
    throw error(404, `피드 '${feedId}'를 찾을 수 없습니다.`);
  }

  const { config } = await loadConfig();
  const container = await getPodsyncStatus();
  const hostname = config.server?.hostname || 'http://localhost:8080';

  // Cloudflare CDN 캐시 XML 패치
  const { channel, episodes } = await fetchFeedEpisodes(hostname, feedId);

  return {
    feedId,
    feed,
    hostname,
    channel,
    uptime: container.uptime,
    episodes
  };
};

export const actions: Actions = {
  delete: async ({ params }) => {
    const feedId = params.id;
    if (!feedId) {
      throw error(400, '피드 ID가 지정되지 않았습니다.');
    }
    await deleteFeed(feedId);
    throw redirect(303, '/');
  }
};
