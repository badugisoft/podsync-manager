import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getFeed, upsertFeed } from '$lib/server/config';
import type { FeedConfig } from '$lib/types/config';

export const load: PageServerLoad = async ({ params }) => {
  const feedId = params.id;
  const feed = await getFeed(feedId);

  if (!feed) {
    throw error(404, `피드 '${feedId}'를 찾을 수 없습니다.`);
  }

  return {
    feedId,
    feed
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
    const feedId = params.id;
    const existingFeed = await getFeed(feedId);

    if (!existingFeed) {
      return fail(404, { error: '수정할 피드를 찾을 수 없습니다.' });
    }

    const formData = await request.formData();
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

    if (!url) {
      return fail(400, { error: '소스 URL을 입력해주세요.' });
    }

    // 기존 설정 복제 후 갱신
    const updatedFeed: FeedConfig = {
      ...existingFeed,
      url,
      format,
      quality,
      page_size: pageSize,
      opml
    };

    if (updatePeriod) {
      updatedFeed.update_period = updatePeriod;
      delete updatedFeed.cron_schedule;
    } else if (cronSchedule) {
      updatedFeed.cron_schedule = cronSchedule;
      delete updatedFeed.update_period;
    }

    if (keepLast !== undefined && !isNaN(keepLast)) {
      updatedFeed.clean = { ...updatedFeed.clean, keep_last: keepLast };
    } else {
      delete updatedFeed.clean;
    }

    // filters 정리
    const filtersObj: Record<string, unknown> = {};
    if (minDuration !== undefined && !isNaN(minDuration)) filtersObj.min_duration = minDuration;
    if (maxDuration !== undefined && !isNaN(maxDuration)) filtersObj.max_duration = maxDuration;
    if (filterTitle) filtersObj.title = filterTitle;
    if (filterNotTitle) filtersObj.not_title = filterNotTitle;
    if (filterDescription) filtersObj.description = filterDescription;
    if (filterNotDescription) filtersObj.not_description = filterNotDescription;
    if (Object.keys(filtersObj).length > 0) {
      updatedFeed.filters = filtersObj;
    } else {
      delete updatedFeed.filters;
    }

    // custom 정리
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
      updatedFeed.custom = customObj;
    } else {
      delete updatedFeed.custom;
    }

    if (youtubeDlArgs && youtubeDlArgs.length > 0) {
      updatedFeed.youtube_dl_args = youtubeDlArgs;
    } else {
      delete updatedFeed.youtube_dl_args;
    }

    try {
      await upsertFeed(feedId, updatedFeed);
    } catch (e: unknown) {
      const err = e as Error;
      return fail(500, { error: `저장 실패: ${err.message}` });
    }

    throw redirect(303, `/feeds/${feedId}`);
  }
};
