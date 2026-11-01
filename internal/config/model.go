package config

type FeedClean struct {
	KeepLast *int `toml:"keep_last,omitempty" json:"keep_last,omitempty"`
}

type FeedFilters struct {
	MinDuration    *int   `toml:"min_duration,omitempty" json:"min_duration,omitempty"`
	MaxDuration    *int   `toml:"max_duration,omitempty" json:"max_duration,omitempty"`
	Title          string `toml:"title,omitempty" json:"title,omitempty"`
	NotTitle       string `toml:"not_title,omitempty" json:"not_title,omitempty"`
	Description    string `toml:"description,omitempty" json:"description,omitempty"`
	NotDescription string `toml:"not_description,omitempty" json:"not_description,omitempty"`
}

type FeedCustom struct {
	CoverArt        string   `toml:"cover_art,omitempty" json:"cover_art,omitempty"`
	CoverArtQuality string   `toml:"cover_art_quality,omitempty" json:"cover_art_quality,omitempty"`
	Category        string   `toml:"category,omitempty" json:"category,omitempty"`
	Subcategories   []string `toml:"subcategories,omitempty" json:"subcategories,omitempty"`
	Explicit        *bool    `toml:"explicit,omitempty" json:"explicit,omitempty"`
	Lang            string   `toml:"lang,omitempty" json:"lang,omitempty"`
	Author          string   `toml:"author,omitempty" json:"author,omitempty"`
	Title           string   `toml:"title,omitempty" json:"title,omitempty"`
	Description     string   `toml:"description,omitempty" json:"description,omitempty"`
	OwnerName       string   `toml:"owner_name,omitempty" json:"owner_name,omitempty"`
	OwnerEmail      string   `toml:"owner_email,omitempty" json:"owner_email,omitempty"`
}

type FeedConfig struct {
	URL            string       `toml:"url" json:"url"`
	PageSize       *int         `toml:"page_size,omitempty" json:"page_size,omitempty"`
	UpdatePeriod   string       `toml:"update_period,omitempty" json:"update_period,omitempty"`
	CronSchedule   string       `toml:"cron_schedule,omitempty" json:"cron_schedule,omitempty"`
	Quality        string       `toml:"quality,omitempty" json:"quality,omitempty"`
	Format         string       `toml:"format,omitempty" json:"format,omitempty"`
	OPML           *bool        `toml:"opml,omitempty" json:"opml,omitempty"`
	YouTubeDLArgs  []string     `toml:"youtube_dl_args,omitempty" json:"youtube_dl_args,omitempty"`
	Clean          *FeedClean   `toml:"clean,omitempty" json:"clean,omitempty"`
	Filters        *FeedFilters `toml:"filters,omitempty" json:"filters,omitempty"`
	Custom         *FeedCustom  `toml:"custom,omitempty" json:"custom,omitempty"`
}

type ServerConfig struct {
	Port     *int   `toml:"port,omitempty" json:"port,omitempty"`
	Hostname string `toml:"hostname,omitempty" json:"hostname,omitempty"`
	Path     string `toml:"path,omitempty" json:"path,omitempty"`
	DataDir  string `toml:"data_dir,omitempty" json:"data_dir,omitempty"`
}

type S3StorageConfig struct {
	EndpointURL    string `toml:"endpoint_url,omitempty" json:"endpoint_url,omitempty"`
	Region         string `toml:"region,omitempty" json:"region,omitempty"`
	Bucket         string `toml:"bucket,omitempty" json:"bucket,omitempty"`
	Prefix         string `toml:"prefix,omitempty" json:"prefix,omitempty"`
	ForcePathStyle *bool  `toml:"force_path_style,omitempty" json:"force_path_style,omitempty"`
}

type StorageConfig struct {
	Type string           `toml:"type,omitempty" json:"type,omitempty"`
	S3   *S3StorageConfig `toml:"s3,omitempty" json:"s3,omitempty"`
}

type DatabaseConfig struct {
	Dir string `toml:"dir,omitempty" json:"dir,omitempty"`
}

type TokensConfig struct {
	YouTube    string `toml:"youtube,omitempty" json:"youtube,omitempty"`
	Vimeo      string `toml:"vimeo,omitempty" json:"vimeo,omitempty"`
	Soundcloud string `toml:"soundcloud,omitempty" json:"soundcloud,omitempty"`
	Twitch     string `toml:"twitch,omitempty" json:"twitch,omitempty"`
}

type CleanupConfig struct {
	KeepLast *int `toml:"keep_last,omitempty" json:"keep_last,omitempty"`
}

type DownloaderConfig struct {
	SelfUpdate *bool `toml:"self_update,omitempty" json:"self_update,omitempty"`
	Timeout    *int  `toml:"timeout,omitempty" json:"timeout,omitempty"`
}

type LogConfig struct {
	Filename   string `toml:"filename,omitempty" json:"filename,omitempty"`
	MaxSize    *int   `toml:"max_size,omitempty" json:"max_size,omitempty"`
	MaxAge     *int   `toml:"max_age,omitempty" json:"max_age,omitempty"`
	MaxBackups *int   `toml:"max_backups,omitempty" json:"max_backups,omitempty"`
	Compress   *bool  `toml:"compress,omitempty" json:"compress,omitempty"`
}

type PodsyncConfig struct {
	Server     *ServerConfig          `toml:"server,omitempty" json:"server,omitempty"`
	Storage    *StorageConfig         `toml:"storage,omitempty" json:"storage,omitempty"`
	Database   *DatabaseConfig        `toml:"database,omitempty" json:"database,omitempty"`
	Tokens     *TokensConfig          `toml:"tokens,omitempty" json:"tokens,omitempty"`
	Cleanup    *CleanupConfig         `toml:"cleanup,omitempty" json:"cleanup,omitempty"`
	Downloader *DownloaderConfig      `toml:"downloader,omitempty" json:"downloader,omitempty"`
	Log        *LogConfig             `toml:"log,omitempty" json:"log,omitempty"`
	Feeds      map[string]*FeedConfig `toml:"feeds,omitempty" json:"feeds,omitempty"`
}
