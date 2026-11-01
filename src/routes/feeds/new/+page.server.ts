import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getFeed, upsertFeed } from '$lib/server/config';
import type { FeedConfig } from '$lib/types/config';

export const load: PageServerLoad = async ({ url }) => {
  const cloneFrom = url.searchParams.get('cloneFrom')?.trim().toLowerCase();
  let cloneSourceFeed: FeedConfig | null = null;

  if (cloneFrom) {
    cloneSourceFeed = await getFeed(cloneFrom);
  }

  return {
    cloneFrom,
    cloneSourceFeed
  };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const feedId = formData.get('feedId')?.toString().trim().toLowerCase() || '';
    const url = formData.get('url')?.toString().trim() || '';
    const format = (formData.get('format')?.toString() || 'audio') as 'audio' | 'video';
    const quality = (formData.get('quality')?.toString() || 'low') as 'low' | 'high';
    const pageSize = formData.get('pageSize') ? Number(formData.get('pageSize')) : 10;
    const updatePeriod = formData.get('updatePeriod')?.toString().trim() || '';
    const cronSchedule = formData.get('cronSchedule')?.toString().trim() || '';
    const opml = formData.get('opml') === 'on';

    // 중첩 속성: clean.keep_last
    const keepLastRaw = formData.get('keepLast')?.toString().trim();
    const keepLast = keepLastRaw ? Number(keepLastRaw) : undefined;

    // 중첩 속성: filters
    const minDurationRaw = formData.get('minDuration')?.toString().trim();
    const minDuration = minDurationRaw ? Number(minDurationRaw) : undefined;
    const maxDurationRaw = formData.get('maxDuration')?.toString().trim();
    const maxDuration = maxDurationRaw ? Number(maxDurationRaw) : undefined;
    const filterTitle = formData.get('filterTitle')?.toString().trim() || undefined;
    const filterNotTitle = formData.get('filterNotTitle')?.toString().trim() || undefined;
    const filterDescription = formData.get('filterDescription')?.toString().trim() || undefined;
    const filterNotDescription = formData.get('filterNotDescription')?.toString().trim() || undefined;

    // 중첩 속성: custom
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

    // 고급 파라미터: youtube_dl_args
    const ytArgsRaw = formData.get('youtubeDlArgs')?.toString().trim() || '';
    const youtubeDlArgs = ytArgsRaw
      ? ytArgsRaw
          .split('\n')
          .map((arg) => arg.trim())
          .filter(Boolean)
      : undefined;

    // 1. 유효성 검사
    if (!feedId) {
      return fail(400, { error: '피드 ID를 입력해주세요.' });
    }
    if (!/^[a-z0-9_]+$/.test(feedId)) {
      return fail(400, { error: '피드 ID는 영문 소문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.' });
    }
    if (!url) {
      return fail(400, { error: '소스 URL을 입력해주세요.' });
    }

    const existing = await getFeed(feedId);
    if (existing) {
      return fail(400, { error: `이미 존재하는 피드 ID('${feedId}')입니다.` });
    }

    // 2. FeedConfig 모델 조립
    const newFeed: FeedConfig = {
      url,
      format,
      quality,
      page_size: pageSize,
      opml
    };

    if (updatePeriod) {
      newFeed.update_period = updatePeriod;
    }
    if (cronSchedule) {
      newFeed.cron_schedule = cronSchedule;
    }
    if (keepLast !== undefined && !isNaN(keepLast)) {
      newFeed.clean = { keep_last: keepLast };
    }

    // filters 조립 (하나라도 있으면 추가)
    const filtersObj: Record<string, unknown> = {};
    if (minDuration !== undefined && !isNaN(minDuration)) filtersObj.min_duration = minDuration;
    if (maxDuration !== undefined && !isNaN(maxDuration)) filtersObj.max_duration = maxDuration;
    if (filterTitle) filtersObj.title = filterTitle;
    if (filterNotTitle) filtersObj.not_title = filterNotTitle;
    if (filterDescription) filtersObj.description = filterDescription;
    if (filterNotDescription) filtersObj.not_description = filterNotDescription;
    if (Object.keys(filtersObj).length > 0) {
      newFeed.filters = filtersObj;
    }

    // custom 조립 (하나라도 있으면 추가)
    const customObj: Record<string, unknown> = {};
    if (customCoverArt) customObj.cover_art = customCoverArt;
    if (customTitle) customObj.title = customTitle;
    if (customDescription) customObj.description = customDescription;
    if (customAuthor) customObj.author = customAuthor;
    if (customCategory) customObj.category = customCategory;
    if (customSubcategories && customSubcategories.length > 0) customObj.subcategories = customSubcategories;
    if (customExplicit) customObj.explicit = true;
    if (customLangTag) customObj.lang = customLangTag;
    if (customOwnerName) customObj.owner_name = customOwnerName;
    if (customOwnerEmail) customObj.owner_email = customOwnerEmail;
    if (Object.keys(customObj).length > 0) {
      newFeed.custom = customObj;
    }

    if (youtubeDlArgs && youtubeDlArgs.length > 0) {
      newFeed.youtube_dl_args = youtubeDlArgs;
    }

    // 3. 원자적 저장
    try {
      await upsertFeed(feedId, newFeed);
    } catch (e: unknown) {
      const err = e as Error;
      return fail(500, { error: `저장 실패: ${err.message}` });
    }

    throw redirect(303, `/feeds/${feedId}`);
  }
};
