import fs from 'node:fs/promises';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { S3Client, ListObjectsV2Command, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import type { EpisodeItem } from '$lib/types/config';
import { loadConfig } from './config';
import { getPodsyncEnv } from './docker';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

interface XmlFeedItem {
  guid?: string | { '#text'?: string };
  title?: string;
  description?: string;
  pubDate?: string;
  'itunes:duration'?: string | number;
  'itunes:image'?: { '@_href'?: string };
  enclosure?: {
    '@_url'?: string;
    '@_length'?: string | number;
    '@_type'?: string;
  };
}

export interface FeedChannelMeta {
  title?: string;
  description?: string;
  image?: string;
  link?: string;
}

export interface FeedEpisodesResult {
  channel: FeedChannelMeta;
  episodes: EpisodeItem[];
}

export async function fetchFeedEpisodes(hostname: string, feedId: string): Promise<FeedEpisodesResult> {
  const cleanHostname = hostname.replace(/\/+$/, '');
  const xmlUrl = `${cleanHostname}/${feedId}.xml`;

  try {
    const res = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'PodsyncManager/0.1.0'
      }
    });

    if (!res.ok) {
      return { channel: { title: feedId }, episodes: [] };
    }

    const xmlText = await res.text();
    const parsed = xmlParser.parse(xmlText);
    const channel = parsed?.rss?.channel;
    if (!channel) {
      return { channel: { title: feedId }, episodes: [] };
    }

    // 채널 커버 이미지 추출
    const channelImage =
      channel['itunes:image']?.['@_href'] ||
      channel.image?.url ||
      (typeof channel.image === 'string' ? channel.image : undefined);

    const channelMeta: FeedChannelMeta = {
      title: channel.title || feedId,
      description: channel.description || '',
      image: channelImage,
      link: channel.link || ''
    };

    if (!channel.item) {
      return { channel: channelMeta, episodes: [] };
    }

    const items: XmlFeedItem[] = Array.isArray(channel.item) ? channel.item : [channel.item];

    const episodes = items.map((item, index) => {
      let id = `ep-${index}`;
      if (typeof item.guid === 'string') {
        id = item.guid;
      } else if (item.guid && typeof item.guid === 'object' && item.guid['#text']) {
        id = item.guid['#text'];
      }

      // enclosure URL
      const audioUrl = item.enclosure?.['@_url'] || '';
      const rawLength = item.enclosure?.['@_length'];
      let fileSize: string | undefined;
      let bytesNum: number | undefined;
      if (rawLength) {
        const b = Number(rawLength);
        if (!isNaN(b) && b > 0) {
          bytesNum = b;
          if (b >= 1024 * 1024 * 1024) {
            fileSize = (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
          } else {
            fileSize = (b / (1024 * 1024)).toFixed(1) + ' MB';
          }
        }
      }

      // duration
      let durationStr: string | undefined;
      if (item['itunes:duration']) {
        durationStr = String(item['itunes:duration']);
      }

      // thumbnail
      const thumbnail = item['itunes:image']?.['@_href'] || channelImage;

      return {
        id,
        title: item.title || 'Untitled Episode',
        description: item.description || '',
        pubDate: item.pubDate || '',
        duration: durationStr,
        thumbnail,
        audioUrl,
        fileSize,
        bytes: bytesNum
      };
    });

    return { channel: channelMeta, episodes };
  } catch (error) {
    console.error(`Failed to fetch/parse feed XML for ${feedId}:`, error);
    return { channel: { title: feedId }, episodes: [] };
  }
}

async function getDirectorySize(dirPath: string): Promise<{ totalBytes: number; fileCount: number }> {
  let totalBytes = 0;
  let fileCount = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = await getDirectorySize(fullPath);
        totalBytes += sub.totalBytes;
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        totalBytes += stat.size;
        fileCount += 1;
      }
    }
  } catch {
    // 디렉토리가 없거나 접근 불가능할 경우 0 반환
  }
  return { totalBytes, fileCount };
}

export async function calculateS3StorageUsage(): Promise<{
  totalBytes: number;
  totalGigabytes: number;
  fileCount: number;
  percentageOfFreeTier: number;
  storageType?: 's3' | 'local';
}> {
  const { config } = await loadConfig();

  // 1. 로컬 스토리지 모드인 경우 로컬 디스크 용량 계산
  if (config.storage?.type === 'local') {
    const localDir = config.server?.data_dir || '/app/data';
    const { totalBytes, fileCount } = await getDirectorySize(localDir);
    const totalGigabytes = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
    const percentageOfFreeTier = Number(Math.min((totalGigabytes / 10) * 100, 100).toFixed(1));
    return {
      totalBytes,
      totalGigabytes,
      fileCount,
      percentageOfFreeTier,
      storageType: 'local'
    };
  }

  // 2. S3 모드인 경우: 프로세스 환경변수 -> podsync 컨테이너 환경변수 순서로 탐색
  const containerEnv = await getPodsyncEnv();
  const s3Config = config.storage?.s3;

  const endpoint = process.env.AWS_ENDPOINT || s3Config?.endpoint_url || containerEnv.AWS_ENDPOINT;
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    containerEnv.AWS_ACCESS_KEY_ID ||
    containerEnv.AWS_ACCESS_KEY ||
    '';
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    containerEnv.AWS_SECRET_ACCESS_KEY ||
    containerEnv.AWS_SECRET_KEY ||
    '';
  const bucket = s3Config?.bucket || containerEnv.AWS_BUCKET || 'podsync-data';
  const region = s3Config?.region || containerEnv.AWS_REGION || 'auto';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('ERR_S3_CREDENTIALS_MISSING');
  }

  const s3ClientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };

  if (endpoint) {
    s3ClientConfig.endpoint = endpoint;
  }

  const s3 = new S3Client(s3ClientConfig);

  let totalBytes = 0;
  let fileCount = 0;
  let continuationToken: string | undefined = undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken
    });

    const output: ListObjectsV2CommandOutput = await s3.send(cmd);
    if (output.Contents) {
      for (const obj of output.Contents) {
        totalBytes += obj.Size || 0;
        fileCount += 1;
      }
    }
    continuationToken = output.NextContinuationToken;
  } while (continuationToken);

  const totalGigabytes = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
  // S3 스토리지 기준 백분율 (기본 10GB 기준)
  const percentageOfFreeTier = Number(Math.min((totalGigabytes / 10) * 100, 100).toFixed(1));

  return {
    totalBytes,
    totalGigabytes,
    fileCount,
    percentageOfFreeTier,
    storageType: 's3'
  };
}
