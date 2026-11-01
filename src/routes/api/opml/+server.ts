import type { RequestHandler } from '@sveltejs/kit';
import { loadConfig } from '$lib/server/config';

export const GET: RequestHandler = async () => {
  const { config } = await loadConfig();
  const hostname = (config.server?.hostname || 'http://localhost:8080').replace(/\/+$/, '');
  const feeds = config.feeds || {};

  const opmlFeeds = Object.entries(feeds).filter(([, f]) => f.opml !== false);

  const outlines = opmlFeeds
    .map(([id, feed]) => {
      const feedXmlUrl = `${hostname}/${id}.xml`;
      const title = id;
      return `    <outline text="${title}" title="${title}" type="rss" xmlUrl="${feedXmlUrl}" htmlUrl="${feed.url}" />`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Podsync Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="podsync-subscriptions.opml"'
    }
  });
};
