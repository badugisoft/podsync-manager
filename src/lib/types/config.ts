export interface FeedClean {
  keep_last?: number;
}

export interface FeedFilters {
  min_duration?: number;
  max_duration?: number;
  title?: string;
  not_title?: string;
  description?: string;
  not_description?: string;
}

export interface FeedCustom {
  cover_art?: string;
  cover_art_quality?: 'low' | 'high';
  category?: string;
  subcategories?: string[];
  explicit?: boolean;
  lang?: string;
  author?: string;
  title?: string;
  description?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface FeedConfig {
  url: string;
  page_size?: number;
  update_period?: string;
  cron_schedule?: string;
  quality?: 'low' | 'high';
  format?: 'audio' | 'video';
  opml?: boolean;
  youtube_dl_args?: string[];
  clean?: FeedClean;
  filters?: FeedFilters;
  custom?: FeedCustom;
  [key: string]: unknown;
}

export interface ServerConfig {
  port?: number;
  hostname?: string;
  path?: string;
  data_dir?: string;
}

export interface S3StorageConfig {
  endpoint_url?: string;
  region?: string;
  bucket?: string;
  prefix?: string;
  force_path_style?: boolean;
}

export interface StorageConfig {
  type?: 's3' | 'local';
  s3?: S3StorageConfig;
}

export interface DatabaseConfig {
  dir?: string;
}

export interface TokensConfig {
  youtube?: string;
  vimeo?: string;
  soundcloud?: string;
  twitch?: string;
}

export interface CleanupConfig {
  keep_last?: number;
}

export interface DownloaderConfig {
  self_update?: boolean;
  timeout?: number;
}

export interface LogConfig {
  filename?: string;
  max_size?: number;
  max_age?: number;
  max_backups?: number;
  compress?: boolean;
}

export interface PodsyncConfig {
  server?: ServerConfig;
  storage?: StorageConfig;
  database?: DatabaseConfig;
  tokens?: TokensConfig;
  cleanup?: CleanupConfig;
  downloader?: DownloaderConfig;
  log?: LogConfig;
  feeds?: Record<string, FeedConfig>;
  [key: string]: unknown;
}

export interface EpisodeItem {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration?: string;
  thumbnail?: string;
  audioUrl: string;
  fileSize?: string;
  bytes?: number;
}
