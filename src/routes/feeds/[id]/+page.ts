import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
  const feedId = params.id;
  const [feedRes, epRes, overviewRes, configRes] = await Promise.all([
    fetch(`/api/feeds/${encodeURIComponent(feedId)}`),
    fetch(`/api/feeds/${encodeURIComponent(feedId)}/episodes`),
    fetch('/api/system/overview'),
    fetch('/api/config')
  ]);

  if (!feedRes.ok) {
    throw error(404, `피드 '${feedId}'를 찾을 수 없습니다.`);
  }

  const feedData = await feedRes.json();
  const epData = epRes.ok ? await epRes.json() : { channel: { title: feedId }, episodes: [] };
  const overviewData = overviewRes.ok ? await overviewRes.json() : { container: {} };
  const configData = configRes.ok ? await configRes.json() : { config: {} };

  return {
    feedId,
    feed: feedData.feed,
    hostname: configData.config?.server?.hostname || 'http://localhost:8080',
    channel: epData.channel,
    uptime: overviewData.container?.uptime || '',
    episodes: epData.episodes || []
  };
};
