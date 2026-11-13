<script lang="ts">
  import { Plus, Radio, ExternalLink, HardDrive, Copy, Check, Clock, Layers, Filter, Download, Search, ArrowUpDown, X, Edit } from '@lucide/svelte';
  import YoutubeIcon from '$lib/components/YoutubeIcon.svelte';
  import RssIcon from '$lib/components/RssIcon.svelte';
  import { getNextSyncInfo } from '$lib/utils/schedule';
  import { onMount, onDestroy } from 'svelte';
  import { i18n, t } from '$lib/i18n/index.svelte';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let { data } = $props();

  // 검색 및 정렬 상태
  let searchQuery = $state('');
  let sortBy = $state<'name_asc' | 'name_desc' | 'episodes_desc'>('name_asc');

  let processedFeeds = $derived(() => {
    let list = [...(data.feeds || [])];

    // 검색 필터링
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => {
        const title = (f.title || '').toLowerCase();
        const id = (f.id || '').toLowerCase();
        const url = (f.url || '').toLowerCase();
        return title.includes(q) || id.includes(q) || url.includes(q);
      });
    }

    // 정렬
    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        const nameA = a.title || a.id || '';
        const nameB = b.title || b.id || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
      }
      if (sortBy === 'name_desc') {
        const nameA = a.title || a.id || '';
        const nameB = b.title || b.id || '';
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
      }
      if (sortBy === 'episodes_desc') {
        const countA = a.episodeCount ?? 0;
        const countB = b.episodeCount ?? 0;
        return countB - countA;
      }
      return 0;
    });

    return list;
  });

  // 실시간 남은 시간 갱신용 틱
  let tick = $state(Date.now());
  let timer: NodeJS.Timeout | null = null;

  onMount(() => {
    timer = setInterval(() => {
      tick = Date.now();
    }, 10000); // 10초마다 갱신
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  // S3 스토리지 용량 상태
  let calculatingStorage = $state(false);
  let storageStats = $state<{
    totalGigabytes: number;
    fileCount: number;
    percentageOfFreeTier: number;
  } | null>(null);
  let storageError = $state<string | null>(null);

  // RSS / OPML 복사 피드백
  let copiedId = $state<string | null>(null);
  let copiedOpml = $state(false);

  async function copyOpmlUrl() {
    const fullUrl = `${window.location.origin}/api/opml`;
    const ok = await copyToClipboard(fullUrl);
    if (ok) {
      copiedOpml = true;
      setTimeout(() => {
        copiedOpml = false;
      }, 2000);
    }
  }

  async function handleCalculateStorage() {
    calculatingStorage = true;
    storageError = null;
    try {
      const res = await fetch('/api/storage/calculate', { method: 'POST' });
      const result = await res.json();
      if (result.ok) {
        storageStats = result.stats;
      } else {
        if (result.code === 'ERR_S3_CREDENTIALS_MISSING') {
          storageError = t('errors.s3CredentialsMissing');
        } else {
          storageError = t('errors.s3CalculateFailed');
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      storageError = err.message;
    } finally {
      calculatingStorage = false;
    }
  }

  async function copyRssUrl(feedId: string) {
    const fullUrl = `${data.hostname.replace(/\/+$/, '')}/${feedId}.xml`;
    const ok = await copyToClipboard(fullUrl);
    if (ok) {
      copiedId = feedId;
      setTimeout(() => {
        copiedId = null;
      }, 2000);
    }
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
  <!-- 상단 요약 & S3 용량 위젯 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- 등록된 피드 수 -->
    <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-slate-400">{t('nav.feedsTooltip')}</p>
        <p class="text-2xl font-bold text-white mt-1">
          {data.feeds.length === 1
            ? t('home.feedCountSingle', { count: 1 })
            : t('home.feedCountPlural', { count: data.feeds.length })}
        </p>
      </div>
      <div class="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
        <Radio class="w-5 h-5" />
      </div>
    </div>

    <!-- S3 스토리지 사용량 (수동 계산) -->
    <div class="md:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <HardDrive class="w-4 h-4 text-indigo-400" />
          <h3 class="text-xs font-semibold text-white">{t('home.storageUsage')}</h3>
        </div>
        <button
          onclick={handleCalculateStorage}
          disabled={calculatingStorage}
          class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
        >
          {calculatingStorage ? t('home.storageCalculating') : t('home.storageCalculateBtn')}
        </button>
      </div>

      <div class="mt-2.5">
        {#if storageStats}
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-slate-400">
                {t('home.storageUsed', { size: storageStats.totalGigabytes, count: storageStats.fileCount })}
              </span>
              <span class="font-medium text-indigo-400">{storageStats.percentageOfFreeTier}% / 10 GB</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                class="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style="width: {storageStats.percentageOfFreeTier}%"
              ></div>
            </div>
          </div>
        {:else if storageError}
          <p class="text-xs text-rose-400">{storageError}</p>
        {:else}
          <p class="text-xs text-slate-400">{t('home.storageFreeDesc')}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- 피드 헤더 & 추가 버튼 -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-xl font-bold text-white tracking-tight">{t('home.title')}</h2>
      <p class="text-sm text-slate-400 mt-1">{t('home.subtitle')}</p>
    </div>
    <div class="flex items-center gap-2">
      <!-- OPML 열기 -->
      <a
        href="/api/opml"
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        <ExternalLink class="w-3.5 h-3.5 text-orange-400" />
        <span>{t('home.openOpml')}</span>
      </a>

      <!-- OPML 복사하기 -->
      <button
        onclick={copyOpmlUrl}
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        {#if copiedOpml}
          <Check class="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('common.copied')}</span>
        {:else}
          <Copy class="w-3.5 h-3.5 text-slate-400" />
          <span>{t('home.copyOpml')}</span>
        {/if}
      </button>

      <a
        href="/feeds/new"
        class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
      >
        <Plus class="w-4 h-4" />
        <span>{t('home.newFeed')}</span>
      </a>
    </div>
  </div>

  <!-- 검색 및 정렬 툴바 -->
  {#if data.feeds.length > 0}
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur">
      <!-- 검색 입력창 -->
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={t('home.searchPlaceholder')}
          class="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            title={t('home.clearSearch')}
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>

      <!-- 정렬 드롭다운 -->
      <div class="flex items-center gap-2 shrink-0">
        <ArrowUpDown class="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span class="text-xs text-slate-400 font-medium shrink-0">{t('home.sortBy')}:</span>
        <select
          bind:value={sortBy}
          class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="name_asc">{t('home.sortNameAsc')}</option>
          <option value="name_desc">{t('home.sortNameDesc')}</option>
          <option value="episodes_desc">{t('home.sortEpisodesDesc')}</option>
        </select>
      </div>
    </div>
  {/if}

  <!-- 피드 카드 그리드 -->
  {#if data.feeds.length === 0}
    <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Radio class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-300">{t('home.noFeedsTitle')}</h3>
      <p class="text-sm text-slate-500 mt-1">{t('home.noFeedsDesc')}</p>
    </div>
  {:else if processedFeeds().length === 0}
    <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Search class="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-300">{t('home.noMatchingFeeds')}</h3>
      <button
        type="button"
        onclick={() => (searchQuery = '')}
        class="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-colors cursor-pointer"
      >
        {t('home.clearSearch')}
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each processedFeeds() as feed (feed.id)}
        {@const syncInfo = getNextSyncInfo(feed.update_period, feed.cron_schedule, data.uptime, tick, i18n.locale)}
        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-sm">
          <!-- 상단: 썸네일 + 제목/요약 + 퀵 아이콘 액션 -->
          <div class="flex items-start justify-between gap-2.5">
            <a href="/feeds/{feed.id}" class="flex items-center gap-3 min-w-0 flex-1 group">
              {#if feed.image}
                <img
                  src={feed.image}
                  alt={feed.title || feed.id}
                  class="w-11 h-11 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                  loading="lazy"
                />
              {:else}
                <div class="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <YoutubeIcon class="w-5 h-5" />
                </div>
              {/if}

              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-white text-sm leading-snug line-clamp-1 group-hover:text-indigo-400 transition-colors" title={feed.title || feed.id}>
                  {feed.title || feed.id}
                </h3>
                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 truncate">
                  <span class="font-mono text-indigo-400 truncate">{feed.id}</span>
                  <span class="text-slate-600">·</span>
                  <span class="text-slate-300 shrink-0">
                    {feed.format === 'video'
                      ? (feed.quality === 'high' ? t('home.formatVideoHigh') : t('home.formatVideoLow'))
                      : (feed.quality === 'high' ? t('home.formatAudioHigh') : t('home.formatAudioLow'))}
                  </span>
                  <span class="text-slate-600">·</span>
                  <span class="text-slate-400 shrink-0">
                    {feed.episodeCount === 1
                      ? t('home.episodeCountSingle', { count: 1 })
                      : t('home.episodeCountPlural', { count: feed.episodeCount ?? 0 })}
                  </span>
                </div>
              </div>
            </a>

            <!-- 우측 고스트 아이콘 퀵액션 (박스 없음) -->
            <div class="flex items-center gap-0.5 shrink-0 -mr-1">
              <button
                type="button"
                onclick={() => copyRssUrl(feed.id)}
                class="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800/70 transition-colors cursor-pointer"
                title={t('home.copyRss')}
                aria-label={t('home.copyRss')}
              >
                {#if copiedId === feed.id}
                  <Check class="w-3.5 h-3.5 text-emerald-400" />
                {:else}
                  <RssIcon class="w-3.5 h-3.5" />
                {/if}
              </button>

              <a
                href={feed.url}
                target="_blank"
                rel="noreferrer"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 transition-colors"
                title={t('episodeDetail.openOnYoutube')}
                aria-label={t('episodeDetail.openOnYoutube')}
              >
                <YoutubeIcon class="w-3.5 h-3.5" />
              </a>

              <a
                href="/feeds/{feed.id}/edit"
                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/70 transition-colors"
                title={t('common.edit')}
                aria-label={t('common.edit')}
              >
                <Edit class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <!-- 하단: 심플한 상태 텍스트 1줄 -->
          <div class="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <div class="flex items-center gap-1.5 min-w-0">
              {#if syncInfo}
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
                <span class="truncate" title="{syncInfo.nextTime}">
                  {t('home.nextSync')}: <strong class="text-slate-200 font-medium">{syncInfo.remaining}</strong>
                </span>
              {:else}
                <Clock class="w-3 h-3 text-slate-500 shrink-0" />
                <span class="truncate">{t('home.syncInterval')}: <strong class="text-slate-300 font-mono">{feed.update_period || feed.cron_schedule || 'default'}</strong></span>
              {/if}
            </div>

            <div class="flex items-center gap-2 shrink-0 text-slate-400">
              <span class="font-mono text-slate-300">{feed.update_period || feed.cron_schedule || 'default'}</span>
              {#if feed.clean?.keep_last}
                <span class="text-slate-600">·</span>
                <span class="inline-flex items-center gap-0.5" title={t('feedForm.cleanKeepLast')}>
                  <Layers class="w-3 h-3 text-slate-500" />
                  <span>{feed.clean.keep_last}</span>
                </span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
