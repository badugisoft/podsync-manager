import type { FeedConfig } from '$lib/types/config';

export function parseFeedFormData(formData: FormData): { feedId: string; feed: FeedConfig } {
  const feedId = formData.get('feedId')?.toString().trim().toLowerCase() || '';
  const url = formData.get('url')?.toString().trim() || '';
  const format = (formData.get('format')?.toString() || 'audio') as 'audio' | 'video';
  const quality = (formData.get('quality')?.toString() || 'low') as 'low' | 'high';
  const pageSize = formData.get('pageSize') ? Number(formData.get('pageSize')) : 10;
  const updatePeriod = formData.get('updatePeriod')?.toString().trim() || undefined;
  const cronSchedule = formData.get('cronSchedule')?.toString().trim() || undefined;
  const opml = formData.get('opml') === 'on';

  // clean
  const keepLastRaw = formData.get('keepLast')?.toString().trim();
  const keepLast = keepLastRaw ? Number(keepLastRaw) : undefined;
  const clean = keepLast !== undefined ? { keep_last: keepLast } : undefined;

  // filters
  const minDurationRaw = formData.get('minDuration')?.toString().trim();
  const maxDurationRaw = formData.get('maxDuration')?.toString().trim();
  const filterTitle = formData.get('filterTitle')?.toString().trim() || undefined;
  const filterNotTitle = formData.get('filterNotTitle')?.toString().trim() || undefined;
  const filterDescription = formData.get('filterDescription')?.toString().trim() || undefined;
  const filterNotDescription = formData.get('filterNotDescription')?.toString().trim() || undefined;

  const filters = {
    min_duration: minDurationRaw ? Number(minDurationRaw) : undefined,
    max_duration: maxDurationRaw ? Number(maxDurationRaw) : undefined,
    title: filterTitle,
    not_title: filterNotTitle,
    description: filterDescription,
    not_description: filterNotDescription
  };
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  // custom
  const customCoverArt = formData.get('customCoverArt')?.toString().trim() || undefined;
  const customTitle = formData.get('customTitle')?.toString().trim() || undefined;
  const customDescription = formData.get('customDescription')?.toString().trim() || undefined;
  const customAuthor = formData.get('customAuthor')?.toString().trim() || undefined;
  const customCategory = formData.get('customCategory')?.toString().trim() || undefined;
  const customSubcategoriesRaw = formData.get('customSubcategories')?.toString().trim() || '';
  const customSubcategories = customSubcategoriesRaw
    ? customSubcategoriesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const customExplicit = formData.get('customExplicit') === 'on' ? true : undefined;
  const customLangTag = formData.get('customLangTag')?.toString().trim() || undefined;
  const customOwnerName = formData.get('customOwnerName')?.toString().trim() || undefined;
  const customOwnerEmail = formData.get('customOwnerEmail')?.toString().trim() || undefined;

  const custom = {
    cover_art: customCoverArt,
    title: customTitle,
    description: customDescription,
    author: customAuthor,
    category: customCategory,
    subcategories: customSubcategories,
    explicit: customExplicit,
    lang: customLangTag,
    owner_name: customOwnerName,
    owner_email: customOwnerEmail
  };
  const hasCustom = Object.values(custom).some((v) => v !== undefined);

  // youtube_dl_args
  const ytArgsRaw = formData.get('youtubeDlArgs')?.toString().trim() || '';
  const youtubeDlArgs = ytArgsRaw
    ? ytArgsRaw.split('\n').map((a) => a.trim()).filter(Boolean)
    : undefined;

  const feed: FeedConfig = {
    url,
    format,
    quality,
    page_size: pageSize,
    opml,
    update_period: updatePeriod,
    cron_schedule: cronSchedule,
    clean,
    filters: hasFilters ? filters : undefined,
    custom: hasCustom ? custom : undefined,
    youtube_dl_args: youtubeDlArgs
  };

  return { feedId, feed };
}
