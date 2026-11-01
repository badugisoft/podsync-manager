import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadConfig, saveConfig, hasBackupConfig } from '$lib/server/config';
import { getPodsyncEnv } from '$lib/server/docker';

export const load: PageServerLoad = async () => {
  const { config, rawToml, path } = await loadConfig();
  const hasBackup = await hasBackupConfig();
  const env = await getPodsyncEnv();

  return {
    config,
    rawToml,
    configPath: path,
    hasBackup,
    envTokens: {
      youtube: env.PODSYNC_YOUTUBE_API_KEY || env.YOUTUBE_API_KEY || '',
      vimeo: env.PODSYNC_VIMEO_API_KEY || env.VIMEO_API_KEY || '',
      soundcloud: env.PODSYNC_SOUNDCLOUD_API_KEY || env.SOUNDCLOUD_API_KEY || '',
      twitch: env.PODSYNC_TWITCH_API_KEY || env.TWITCH_API_KEY || ''
    }
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const { config } = await loadConfig();

    // Server
    const port = formData.get('serverPort') ? Number(formData.get('serverPort')) : undefined;
    const hostname = formData.get('serverHostname')?.toString().trim() || undefined;
    const serverPath = formData.get('serverPath')?.toString().trim() || undefined;
    const serverDataDir = formData.get('serverDataDir')?.toString().trim() || undefined;

    config.server = {
      ...config.server,
      port: port || 8080,
      hostname: hostname || config.server?.hostname || 'http://localhost:8080'
    };
    if (serverPath) config.server.path = serverPath; else delete config.server.path;
    if (serverDataDir) config.server.data_dir = serverDataDir; else delete config.server.data_dir;

    // Database
    const databaseDir = formData.get('databaseDir')?.toString().trim() || undefined;
    if (databaseDir) {
      config.database = { dir: databaseDir };
    } else {
      delete config.database;
    }

    // Tokens
    const youtubeToken = formData.get('youtubeToken')?.toString().trim() || undefined;
    const vimeoToken = formData.get('vimeoToken')?.toString().trim() || undefined;
    const soundcloudToken = formData.get('soundcloudToken')?.toString().trim() || undefined;
    const twitchToken = formData.get('twitchToken')?.toString().trim() || undefined;
    const tokensObj: Record<string, string> = {};
    if (youtubeToken) tokensObj.youtube = youtubeToken;
    if (vimeoToken) tokensObj.vimeo = vimeoToken;
    if (soundcloudToken) tokensObj.soundcloud = soundcloudToken;
    if (twitchToken) tokensObj.twitch = twitchToken;
    if (Object.keys(tokensObj).length > 0) {
      config.tokens = tokensObj;
    } else {
      delete config.tokens;
    }

    // Cleanup
    const keepLast = formData.get('cleanupKeepLast') ? Number(formData.get('cleanupKeepLast')) : undefined;
    if (keepLast !== undefined && !isNaN(keepLast)) {
      config.cleanup = { ...config.cleanup, keep_last: keepLast };
    } else {
      delete config.cleanup;
    }

    // Storage
    const storageType = (formData.get('storageType')?.toString().trim() || 's3') as 's3' | 'local';
    const s3Bucket = formData.get('s3Bucket')?.toString().trim() || undefined;
    const s3Endpoint = formData.get('s3Endpoint')?.toString().trim() || undefined;
    const s3Region = formData.get('s3Region')?.toString().trim() || undefined;
    const s3Prefix = formData.get('s3Prefix')?.toString().trim() || undefined;
    const forcePathStyle = formData.get('forcePathStyle') === 'on' ? true : undefined;

    if (storageType === 'local') {
      config.storage = { type: 'local' };
    } else {
      const s3Obj: Record<string, unknown> = {};
      if (s3Bucket) s3Obj.bucket = s3Bucket;
      if (s3Endpoint) s3Obj.endpoint_url = s3Endpoint;
      if (s3Region) s3Obj.region = s3Region;
      if (s3Prefix) s3Obj.prefix = s3Prefix;
      if (forcePathStyle) s3Obj.force_path_style = true;

      config.storage = {
        type: 's3',
        ...(Object.keys(s3Obj).length > 0 ? { s3: s3Obj } : {})
      };
    }

    // Downloader
    const downloaderSelfUpdate = formData.get('downloaderSelfUpdate') === 'on' ? true : undefined;
    const downloaderTimeoutRaw = formData.get('downloaderTimeout')?.toString().trim();
    const downloaderTimeout = downloaderTimeoutRaw ? Number(downloaderTimeoutRaw) : undefined;
    const downloaderObj: Record<string, unknown> = {};
    if (downloaderSelfUpdate) downloaderObj.self_update = true;
    if (downloaderTimeout) downloaderObj.timeout = downloaderTimeout;
    if (Object.keys(downloaderObj).length > 0) {
      config.downloader = downloaderObj;
    } else {
      delete config.downloader;
    }

    // Log
    const logFilename = formData.get('logFilename')?.toString().trim() || undefined;
    const logMaxSize = formData.get('logMaxSize') ? Number(formData.get('logMaxSize')) : undefined;
    const logMaxAge = formData.get('logMaxAge') ? Number(formData.get('logMaxAge')) : undefined;
    const logMaxBackups = formData.get('logMaxBackups') ? Number(formData.get('logMaxBackups')) : undefined;
    const logCompress = formData.get('logCompress') === 'on' ? true : undefined;
    const logObj: Record<string, unknown> = {};
    if (logFilename) logObj.filename = logFilename;
    if (logMaxSize) logObj.max_size = logMaxSize;
    if (logMaxAge) logObj.max_age = logMaxAge;
    if (logMaxBackups) logObj.max_backups = logMaxBackups;
    if (logCompress) logObj.compress = true;
    if (Object.keys(logObj).length > 0) {
      config.log = logObj;
    } else {
      delete config.log;
    }

    try {
      await saveConfig(config);
      return { success: true };
    } catch (e: unknown) {
      const err = e as Error;
      return fail(500, { error: `저장 실패: ${err.message}` });
    }
  }
};
