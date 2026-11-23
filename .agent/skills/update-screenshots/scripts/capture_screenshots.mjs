import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO_ROOT = process.cwd();
const DIST_DIR = path.join(REPO_ROOT, 'internal/web/dist');
const OUT_DIR = path.join(REPO_ROOT, 'assets/screenshots');
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const USER_DATA_DIR = '/tmp/chrome-podsync-ss-' + Date.now();

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---- Mock Cover Art SVGs ----
function makeCoverSvg(title, subtitle, c1, c2, icon) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="32" fill="url(#g)"/>
  <circle cx="320" cy="80" r="90" fill="rgba(255,255,255,0.08)"/>
  <circle cx="70" cy="340" r="110" fill="rgba(0,0,0,0.15)"/>
  <text x="40" y="180" font-size="56" font-family="system-ui, sans-serif">${icon}</text>
  <text x="40" y="236" font-size="34" font-weight="800" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif">${title}</text>
  <text x="40" y="272" font-size="18" font-weight="600" fill="rgba(255,255,255,0.82)" font-family="system-ui, -apple-system, sans-serif">${subtitle}</text>
</svg>`;
}

const ART_MAP = {
  'tech.svg': makeCoverSvg('Tech Talks', 'DAILY PODCAST', '#4f46e5', '#1e1b4b', '🎙️'),
  'science.svg': makeCoverSvg('Science', 'WEEKLY DIGEST', '#0891b2', '#0f172a', '🔬'),
  'indie.svg': makeCoverSvg('Indie Dev', 'BUILDERS LOG', '#db2777', '#3b0764', '💻'),
  'ambient.svg': makeCoverSvg('Ambient', 'SOUNDSCAPES', '#059669', '#064e3b', '🎧'),
};

// ---- Mock Data ----
const MOCK_FEEDS_OBJ = {
  'tech-talks-daily': {
    url: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
    page_size: 15,
    update_period: '6h',
    quality: 'high',
    format: 'audio',
    opml: true,
    youtube_dl_args: ['--format', '18', '--extractor-args', 'youtube:player-client=android', '--match-filter', '!is_live'],
    clean: { keep_last: 15 },
    filters: { min_duration: 300, max_duration: 7200, not_title: '#shorts|Live Stream' },
    custom: {
      title: 'Tech Talks Daily',
      author: 'Alex Rivera',
      description: 'Deep dives into distributed systems, cloud-native architecture, and developer tooling.',
      category: 'Technology',
      subcategories: ['Software How-To'],
      lang: 'en',
      explicit: false,
      cover_art: '/mock-art/tech.svg',
      cover_art_quality: 'high',
      owner_name: 'Alex Rivera',
      owner_email: 'alex@example.com'
    }
  },
  'science-weekly': {
    url: 'https://www.youtube.com/playlist?list=PLScienceWeeklyDemo01',
    page_size: 10,
    cron_schedule: '0 */4 * * *',
    quality: 'high',
    format: 'audio',
    opml: true,
    youtube_dl_args: ['--format', '18', '-S', 'lang:en'],
    clean: { keep_last: 10 },
    filters: { min_duration: 600 },
    custom: {
      title: 'Science Weekly',
      author: 'Dr. Maya Lin',
      description: 'Exploring astrophysics, biotech breakthroughs, and climate science every week.',
      category: 'Science',
      lang: 'en',
      explicit: false,
      cover_art: '/mock-art/science.svg'
    }
  },
  'indie-dev-podcast': {
    url: 'https://soundcloud.com/indie-dev-demo',
    page_size: 20,
    update_period: '12h',
    quality: 'low',
    format: 'audio',
    opml: true,
    clean: { keep_last: 20 },
    custom: {
      title: 'Indie Dev Podcast',
      author: 'Sam & Jordan',
      description: 'Bootstrapping SaaS products, open-source sustainability, and solo engineering.',
      category: 'Business',
      lang: 'en',
      explicit: false,
      cover_art: '/mock-art/indie.svg'
    }
  },
  'ambient-soundscapes': {
    url: 'https://vimeo.com/channels/ambientsoundscapes',
    page_size: 5,
    update_period: '24h',
    quality: 'high',
    format: 'video',
    opml: false,
    clean: { keep_last: 5 },
    custom: {
      title: 'Ambient Soundscapes',
      author: 'Nordic Audio Lab',
      description: 'Binaural field recordings and focus soundscapes in 1080p.',
      category: 'Arts',
      lang: 'en',
      explicit: false,
      cover_art: '/mock-art/ambient.svg'
    }
  }
};

const MOCK_EPISODES_BY_FEED = {
  'tech-talks-daily': [
    {
      id: 'ep-101',
      title: 'EP 142: Zero-Downtime SQLite & Go Single Binaries in Production',
      description: 'How to package embedded SPAs with Go embed.FS, handle atomic config writes with temp files and rename, and keep container footprints under 35MB.',
      pubDate: 'Sun, 22 Nov 2026 09:00:00 +0000',
      duration: '42:18',
      thumbnail: '/mock-art/tech.svg',
      audioUrl: '/mock-audio/ep-101.mp3',
      fileSize: '38.7 MB',
      bytes: 40579891
    },
    {
      id: 'ep-102',
      title: 'EP 141: Designing Resilient SSE Log Streams for Docker Containers',
      description: 'Streaming live container stdout/stderr over Server-Sent Events with backpressure handling, structured severity parsing, and reconnection.',
      pubDate: 'Fri, 20 Nov 2026 09:00:00 +0000',
      duration: '36:45',
      thumbnail: '/mock-art/tech.svg',
      audioUrl: '/mock-audio/ep-102.mp3',
      fileSize: '33.6 MB',
      bytes: 35232153
    },
    {
      id: 'ep-103',
      title: 'EP 140: S3-Compatible Object Storage Across R2, MinIO, and Wasabi',
      description: 'Comparing path-style vs virtual-hosted addressing, lifecycle policies, and cost-effective storage auditing.',
      pubDate: 'Wed, 18 Nov 2026 09:00:00 +0000',
      duration: '49:10',
      thumbnail: '/mock-art/tech.svg',
      audioUrl: '/mock-audio/ep-103.mp3',
      fileSize: '45.1 MB',
      bytes: 47290777
    }
  ],
  'science-weekly': [
    {
      id: 'sci-201',
      title: 'Mapping Exoplanet Atmospheres with Next-Gen Interferometry',
      description: 'New spectral analysis techniques revealing water vapor and methane signatures in distant rocky worlds.',
      pubDate: 'Sat, 21 Nov 2026 14:00:00 +0000',
      duration: '51:22',
      thumbnail: '/mock-art/science.svg',
      audioUrl: '/mock-audio/sci-201.mp3',
      fileSize: '47.0 MB',
      bytes: 49283072
    },
    {
      id: 'sci-202',
      title: 'CRISPR Base Editing: From Lab Bench to Clinical Trials',
      description: 'A look at precision gene editing milestones achieved in 2026.',
      pubDate: 'Sat, 14 Nov 2026 14:00:00 +0000',
      duration: '44:05',
      thumbnail: '/mock-art/science.svg',
      audioUrl: '/mock-audio/sci-202.mp3',
      fileSize: '40.3 MB',
      bytes: 42257612
    }
  ],
  'indie-dev-podcast': [
    {
      id: 'indie-301',
      title: '#88: Shipping Self-Hosted Tools People Actually Love',
      description: 'Why simple Docker Compose setups, clear docs, and zero-telemetry defaults win over homelabbers.',
      pubDate: 'Thu, 19 Nov 2026 16:30:00 +0000',
      duration: '31:50',
      thumbnail: '/mock-art/indie.svg',
      audioUrl: '/mock-audio/indie-301.mp3',
      fileSize: '29.2 MB',
      bytes: 30618419
    }
  ],
  'ambient-soundscapes': [
    {
      id: 'amb-401',
      title: 'Fjord Dawn — 60 Minutes of Nordic Rain & Distant Pines',
      description: 'Recorded on location in western Norway with binaural microphones.',
      pubDate: 'Tue, 17 Nov 2026 07:00:00 +0000',
      duration: '59:58',
      thumbnail: '/mock-art/ambient.svg',
      audioUrl: '/mock-audio/amb-401.mp4',
      fileSize: '214.5 MB',
      bytes: 224919552
    }
  ]
};

const APPLIED_TOML = `[feeds.tech-talks-daily]
url = "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"
page_size = 15
update_period = "6h"
quality = "high"
format = "audio"
opml = true

[server]
port = 8080
hostname = "https://podcasts.example.com"
data_dir = "/app/data"

[storage]
type = "s3"

[storage.s3]
endpoint_url = "https://s3.us-west-2.amazonaws.com"
region = "us-west-2"
bucket = "my-podsync-media"
prefix = "episodes/"
force_path_style = false

[database]
dir = "/app/data/db"

[tokens]
youtube = "AIzaSyD-REDACTED-EXAMPLE-KEY"

[cleanup]
keep_last = 15

[downloader]
self_update = true
timeout = 15

[log]
filename = "/app/data/podsync.log"
max_size = 50
max_age = 30
max_backups = 5
compress = true
`;

const CURRENT_TOML = APPLIED_TOML
  .replace('update_period = "6h"', 'update_period = "4h"')
  .replace('keep_last = 15', 'keep_last = 20');

const MOCK_CONFIG = {
  server: { port: 8080, hostname: 'https://podcasts.example.com', path: '', data_dir: '/app/data' },
  storage: {
    type: 's3',
    s3: {
      endpoint_url: 'https://s3.us-west-2.amazonaws.com',
      region: 'us-west-2',
      bucket: 'my-podsync-media',
      prefix: 'episodes/',
      force_path_style: false
    }
  },
  database: { dir: '/app/data/db' },
  tokens: { youtube: 'AIzaSyD-REDACTED-EXAMPLE-KEY', vimeo: '', soundcloud: '', twitch: '' },
  cleanup: { keep_last: 15 },
  downloader: { self_update: true, timeout: 15 },
  log: { filename: '/app/data/podsync.log', max_size: 50, max_age: 30, max_backups: 5, compress: true },
  feeds: MOCK_FEEDS_OBJ
};

let unauthMode = false;

function computeDiffLines(oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const lines = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) {
      lines.push({ type: 'unchanged', text: a[i] });
    } else {
      if (a[i] !== undefined) lines.push({ type: 'removed', text: a[i] });
      if (b[i] !== undefined) lines.push({ type: 'added', text: b[i] });
    }
  }
  return lines;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://127.0.0.1');
  const pathname = urlObj.pathname;

  if (pathname.startsWith('/mock-art/')) {
    const name = path.basename(pathname);
    if (ART_MAP[name]) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(ART_MAP[name]);
      return;
    }
  }

  if (pathname.startsWith('/mock-audio/')) {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
    res.end(Buffer.alloc(128));
    return;
  }

  if (pathname === '/api/auth/me') {
    return sendJson(res, 200, unauthMode ? { authenticated: false } : { authenticated: true, username: 'admin' });
  }

  if (pathname === '/api/system/overview') {
    return sendJson(res, 200, {
      container: { name: 'podsync', status: 'running', stateText: 'Up 14 days', uptime: '14d 6h 22m' },
      hasChanges: true,
      hasBackup: true,
      feedsCount: Object.keys(MOCK_FEEDS_OBJ).length,
      mtime: 1732345600000,
      version: '0.2.10',
      pendingRedownloads: 0
    });
  }

  if (pathname === '/api/feeds') {
    const feeds = Object.entries(MOCK_FEEDS_OBJ).map(([id, f]) => ({
      id,
      title: f.custom?.title || id,
      image: f.custom?.cover_art || '',
      episodeCount: (MOCK_EPISODES_BY_FEED[id] || []).length,
      ...f
    }));
    return sendJson(res, 200, { feeds, configPath: '/app/config.toml' });
  }

  if (pathname === '/api/episodes') {
    const allEpisodes = [];
    const feedSummaries = [];
    for (const [id, f] of Object.entries(MOCK_FEEDS_OBJ)) {
      const title = f.custom?.title || id;
      const image = f.custom?.cover_art || '';
      feedSummaries.push({ id, title, image });
      for (const ep of MOCK_EPISODES_BY_FEED[id] || []) {
        allEpisodes.push({
          ...ep,
          feedId: id,
          feedTitle: title,
          feedImage: image,
          format: f.format || 'audio'
        });
      }
    }
    return sendJson(res, 200, { episodes: allEpisodes, feeds: feedSummaries });
  }

  const feedEpMatch = pathname.match(/^\/api\/feeds\/([^/]+)\/episodes$/);
  if (feedEpMatch) {
    const id = decodeURIComponent(feedEpMatch[1]);
    const f = MOCK_FEEDS_OBJ[id];
    return sendJson(res, 200, {
      channel: {
        title: f?.custom?.title || id,
        description: f?.custom?.description || '',
        image: f?.custom?.cover_art || '',
        link: f?.url || ''
      },
      episodes: MOCK_EPISODES_BY_FEED[id] || []
    });
  }

  const feedMatch = pathname.match(/^\/api\/feeds\/([^/]+)$/);
  if (feedMatch) {
    const id = decodeURIComponent(feedMatch[1]);
    const f = MOCK_FEEDS_OBJ[id];
    if (!f) return sendJson(res, 404, { error: 'Not found' });
    return sendJson(res, 200, { id, feed: f });
  }

  if (pathname === '/api/config') {
    return sendJson(res, 200, {
      config: MOCK_CONFIG,
      rawToml: CURRENT_TOML,
      hasBackup: true,
      mtime: 1732345600000,
      envTokens: {
        youtube: 'AIzaSyD-REDACTED-EXAMPLE-KEY',
        vimeo: '',
        soundcloud: '',
        twitch: ''
      }
    });
  }

  if (pathname === '/api/config/preview') {
    return sendJson(res, 200, { toml: CURRENT_TOML });
  }

  if (pathname === '/api/config/diff') {
    return sendJson(res, 200, {
      appliedToml: APPLIED_TOML,
      currentToml: CURRENT_TOML,
      diffLines: computeDiffLines(APPLIED_TOML, CURRENT_TOML),
      hasChanges: true
    });
  }

  if (pathname === '/api/storage/calculate') {
    return sendJson(res, 200, {
      ok: true,
      stats: {
        totalBytes: 2485329920,
        totalGigabytes: 2.31,
        fileCount: 42,
        percentageOfFreeTier: 23.1,
        storageType: 's3'
      }
    });
  }

  if (pathname === '/api/container/logs') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    const logLines = [
      'time="2026-11-23T06:00:01Z" level=info msg="Podsync v2.8.0 starting up..."',
      'time="2026-11-23T06:00:01Z" level=info msg="Loaded 4 feeds from /app/config.toml"',
      'time="2026-11-23T06:00:02Z" level=info msg="Connected to S3 bucket: my-podsync-media (us-west-2)"',
      'time="2026-11-23T06:00:03Z" level=info msg="HTTP server listening on :8080"',
      'time="2026-11-23T06:01:12Z" level=info msg="Updating feed: tech-talks-daily"',
      'time="2026-11-23T06:01:14Z" level=debug msg="yt-dlp --format 18 --extractor-args youtube:player-client=android"',
      'time="2026-11-23T06:01:28Z" level=info msg="Downloaded EP 142: Zero-Downtime SQLite & Go Single Binaries (38.7 MB)"',
      'time="2026-11-23T06:01:31Z" level=info msg="Uploaded tech-talks-daily/ep-101.mp3 to S3"',
      'time="2026-11-23T06:02:05Z" level=info msg="Updating feed: science-weekly"',
      'time="2026-11-23T06:02:09Z" level=warn msg="Rate limit approaching for YouTube Data API, backing off 2s"',
      'time="2026-11-23T06:02:13Z" level=info msg="Feed science-weekly is up to date (10 episodes)"',
      'time="2026-11-23T06:03:00Z" level=info msg="Updating feed: indie-dev-podcast"',
      'time="2026-11-23T06:03:04Z" level=info msg="Cleanup retained latest 20 episodes for indie-dev-podcast"',
      'time="2026-11-23T06:04:10Z" level=error msg="Transient timeout fetching thumbnail for amb-401, retrying (1/3)"',
      'time="2026-11-23T06:04:12Z" level=info msg="Thumbnail fetch succeeded on retry for amb-401"',
      'time="2026-11-23T06:05:00Z" level=info msg="OPML & RSS XML regenerated successfully"'
    ];
    for (const line of logLines) {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    return sendJson(res, 200, { ok: true });
  }

  // Static file serving
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const BASE_URL = `http://127.0.0.1:${port}`;
console.log(`Mock server listening on ${BASE_URL}`);

// ---- Launch Chrome Headless ----
const chrome = spawn(CHROME_BIN, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--remote-debugging-port=0',
  `--user-data-dir=${USER_DATA_DIR}`,
  '--window-size=1440,900',
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

const wsUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 15000);
  let buf = '';
  chrome.stderr.on('data', (chunk) => {
    buf += chunk.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) {
      clearTimeout(timer);
      resolve(m[1]);
    }
  });
  chrome.on('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Chrome exited early with code ${code}: ${buf}`));
  });
});

// Get page target WebSocket
const versionRes = await fetch(wsUrl.replace('ws://', 'http://').replace(/\/devtools\/browser\/.*/, '/json/list'));
const targets = await versionRes.json();
const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve));

let msgId = 1;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expression) {
  const res = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return res.result?.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capturePage({ name, route, unauth = false, beforeCapture = null }) {
  unauthMode = unauth;
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  await cdp('Page.navigate', { url: `${BASE_URL}${route}` });
  await sleep(1200);

  // Force English + Dark theme in localStorage if not already set, then reload once on first page
  const needsReload = await evalJs(`(() => {
    const l = localStorage.getItem('podsync_language');
    const t = localStorage.getItem('podsync_theme');
    if (l !== 'en' || t !== 'dark') {
      localStorage.setItem('podsync_language', 'en');
      localStorage.setItem('podsync_theme', 'dark');
      return true;
    }
    return false;
  })()`);
  if (needsReload) {
    await cdp('Page.navigate', { url: `${BASE_URL}${route}` });
    await sleep(1200);
  }

  // Expand all collapsed <details> elements
  await evalJs(`(() => {
    document.querySelectorAll('details').forEach(d => { d.open = true; });
  })()`);
  await sleep(300);

  if (beforeCapture) {
    await beforeCapture();
    await sleep(600);
  }

  // Re-expand any newly revealed <details>
  await evalJs(`(() => {
    document.querySelectorAll('details').forEach(d => { d.open = true; });
  })()`);
  await sleep(300);

  const height = await evalJs(`Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 900)`);
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: Math.min(height, 12000),
    deviceScaleFactor: 2,
    mobile: false
  });
  await sleep(250);

  const { data } = await cdp('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const outPath = path.join(OUT_DIR, `${name}.png`);
  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  console.log(`Captured ${outPath} (1440x${height})`);
}

try {
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  await capturePage({
    name: 'login',
    route: '/login',
    unauth: true
  });

  await capturePage({
    name: 'dashboard',
    route: '/',
    beforeCapture: async () => {
      await evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const calcBtn = btns.find(b => /calculate|storage/i.test(b.textContent || ''));
        if (calcBtn) calcBtn.click();
      })()`);
    }
  });

  await capturePage({
    name: 'config-diff-modal',
    route: '/',
    beforeCapture: async () => {
      await evalJs(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const applyBtn = btns.find(b => /apply|review|diff|restart/i.test(b.textContent || ''));
        if (applyBtn) applyBtn.click();
      })()`);
    }
  });

  await capturePage({
    name: 'feed-detail',
    route: '/feeds/tech-talks-daily'
  });

  await capturePage({
    name: 'feed-new',
    route: '/feeds/new'
  });

  await capturePage({
    name: 'feed-edit',
    route: '/feeds/tech-talks-daily/edit'
  });

  await capturePage({
    name: 'episodes',
    route: '/episodes'
  });

  await capturePage({
    name: 'episode-player',
    route: '/feeds/tech-talks-daily/episodes/ep-101'
  });

  await capturePage({
    name: 'logs',
    route: '/logs'
  });

  await capturePage({
    name: 'settings',
    route: '/settings'
  });

  console.log('All screenshots captured successfully!');
} finally {
  ws.close();
  chrome.kill('SIGKILL');
  server.close();
  fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
}
