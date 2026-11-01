import type { PageServerLoad } from './$types';
import { loadConfig } from '$lib/server/config';
import { getPodsyncStatus } from '$lib/server/docker';
import { fetchFeedEpisodes } from '$lib/server/episodes';
import type { FeedConfig } from '$lib/types/config';

export const load: PageServerLoad = async () => {
  const { config, path } = await loadConfig();
  const container = await getPodsyncStatus();
  const hostname = config.server?.hostname || 'http://localhost:8080';
  const feeds = config.feeds || {};

  // 각 피드의 메타 정보(채널 이미지, 제목) 병렬 조회
  const feedEntries = Object.entries(feeds);
  const feedList = await Promise.all(
    feedEntries.map(async ([id, feed]) => {
      const { channel, episodes } = await fetchFeedEpisodes(hostname, id);
      const image = channel.image || episodes[0]?.thumbnail;
      const title = channel.title && channel.title !== id ? channel.title : id;

      return {
        id,
        title,
        image,
        episodeCount: episodes.length,
        ...(feed as FeedConfig)
      };
    })
  );

  return {
    configPath: path,
    uptime: container.uptime,
    feeds: feedList
  };
};

