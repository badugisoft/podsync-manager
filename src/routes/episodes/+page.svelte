<script lang="ts">
  import { Radio, Clock, HardDrive, Play, Search, ArrowUpDown, X, RotateCcw, Filter, ListMusic } from '@lucide/svelte';
  import { t, i18n } from '$lib/i18n';

  interface AllEpisodeItem {
    id: string;
    title: string;
    description: string;
    pubDate: string;
    duration?: string;
    thumbnail?: string;
    audioUrl: string;
    fileSize?: string;
    bytes?: number;
    feedId: string;
    feedTitle: string;
    feedImage?: string;
    format?: string;
  }

  interface FeedSummary {
    id: string;
    title: string;
    image?: string;
  }

  let { data }: {
    data: {
      episodes: AllEpisodeItem[];
      feeds: FeedSummary[];
    };
  } = $props();

  let searchQuery = $state('');
  let selectedFeedId = $state('all');
  let sortBy = $state<'latest' | 'oldest' | 'size_desc'>('latest');
  let redownloadingKey = $state<string | null>(null);

  function parseDateMs(raw?: string): number {
    if (!raw) return 0;
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? 0 : ms;
  }

  let processedEpisodes = $derived(() => {
    let list = [...(data.episodes || [])];

    if (selectedFeedId !== 'all') {
      list = list.filter((ep) => ep.feedId === selectedFeedId);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((ep) => {
        const title = (ep.title || '').toLowerCase();
        const desc = (ep.description || '').toLowerCase();
        const feedTitle = (ep.feedTitle || '').toLowerCase();
        const feedId = (ep.feedId || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || feedTitle.includes(q) || feedId.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return parseDateMs(b.pubDate) - parseDateMs(a.pubDate);
      }
      if (sortBy === 'oldest') {
        return parseDateMs(a.pubDate) - parseDateMs(b.pubDate);
      }
      if (sortBy === 'size_desc') {
        return (b.bytes || 0) - (a.bytes || 0);
      }
      return 0;
    });

    return list;
  });

  let totalBytes = $derived(() => {
    let sum = 0;
    for (const ep of processedEpisodes()) {
      if (ep.bytes) {
        sum += ep.bytes;
      }
    }
    return sum;
  });

  let totalSizeFormatted = $derived(() => {
    const bytes = totalBytes();
    if (bytes === 0) return null;
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  });

  function formatLocaleDate(dateStr: string) {
    try {
      const localeMap: Record<string, string> = {
        ko: 'ko-KR',
        ja: 'ja-JP',
        zh: 'zh-CN',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE'
      };
      const locale = localeMap[i18n.locale] || 'en-US';
      return new Date(dateStr).toLocaleDateString(locale);
    } catch {
      return dateStr;
    }
  }

  function clearFilters() {
    searchQuery = '';
    selectedFeedId = 'all';
  }

  async function handleRedownloadEpisode(ep: AllEpisodeItem, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('feedDetail.redownloadEpisodeConfirm'))) {
      return;
    }
    const key = `${ep.feedId}:${ep.id}`;
    redownloadingKey = key;
    try {
      const ext = ep.format === 'video' ? 'mp4' : 'mp3';
      const res = await fetch(
        `/api/feeds/${encodeURIComponent(ep.feedId)}/episodes/${encodeURIComponent(ep.id)}/redownload?ext=${ext}`,
        { method: 'POST' }
      );
      if (res.ok) {
        alert(t('feedDetail.redownloadQueuedSuccess'));
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || '재다운로드 요청 실패');
      }
    } catch {
      alert('서버와 통신할 수 없습니다.');
    } finally {
      redownloadingKey = null;
    }
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  <!-- 상단 헤더 & 통계 배지 -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
        <ListMusic class="w-6 h-6 text-indigo-400" />
        <span>{t('allEpisodes.title')}</span>
      </h1>
      <p class="text-sm text-slate-400 mt-1">{t('allEpisodes.subtitle')}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2.5">
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
        <Radio class="w-3.5 h-3.5 text-indigo-400" />
        {#if searchQuery.trim() || selectedFeedId !== 'all'}
          <span>{t('allEpisodes.filteredCount', { filtered: processedEpisodes().length, total: data.episodes.length })}</span>
        {:else}
          <span>{t('allEpisodes.totalEpisodesCount', { count: data.episodes.length })}</span>
        {/if}
      </span>

      {#if totalSizeFormatted()}
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
          <HardDrive class="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('feedDetail.totalSize')}: <strong class="text-white">{totalSizeFormatted()}</strong></span>
        </span>
      {/if}
    </div>
  </div>

  <!-- 검색, 피드 필터 및 정렬 툴바 -->
  {#if data.episodes.length > 0}
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backdrop-blur">
      <!-- 검색 입력창 -->
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={t('allEpisodes.searchPlaceholder')}
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

      <!-- 피드 필터 & 정렬 -->
      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <!-- 피드 필터 드롭다운 -->
        <div class="flex items-center gap-1.5">
          <Filter class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            bind:value={selectedFeedId}
            class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[200px]"
          >
            <option value="all">{t('allEpisodes.allFeeds')}</option>
            {#each data.feeds as feed (feed.id)}
              <option value={feed.id}>{feed.title || feed.id}</option>
            {/each}
          </select>
        </div>

        <!-- 정렬 드롭다운 -->
        <div class="flex items-center gap-1.5">
          <ArrowUpDown class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span class="text-xs text-slate-400 font-medium hidden sm:inline shrink-0">{t('home.sortBy')}:</span>
          <select
            bind:value={sortBy}
            class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="latest">{t('allEpisodes.sortLatest')}</option>
            <option value="oldest">{t('allEpisodes.sortOldest')}</option>
            <option value="size_desc">{t('allEpisodes.sortSizeDesc')}</option>
          </select>
        </div>
      </div>
    </div>
  {/if}

  <!-- 에피소드 목록 -->
  {#if data.episodes.length === 0}
    <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Radio class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <p class="text-sm text-slate-300 font-medium">{t('feedDetail.noEpisodesTitle')}</p>
      <p class="text-xs text-slate-500 mt-1">{t('feedDetail.noEpisodesDesc')}</p>
    </div>
  {:else if processedEpisodes().length === 0}
    <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Search class="w-10 h-10 text-slate-600 mx-auto mb-3" />
      <p class="text-sm text-slate-300 font-medium">{t('feedDetail.noEpisodesMatch', { query: searchQuery || selectedFeedId })}</p>
      <button
        type="button"
        onclick={clearFilters}
        class="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-colors cursor-pointer"
      >
        {t('home.clearSearch')}
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each processedEpisodes() as ep (`${ep.feedId}:${ep.id}`)}
        {@const itemKey = `${ep.feedId}:${ep.id}`}
        <div
          class="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex gap-4 transition-all hover:bg-slate-800/40 group"
        >
          <!-- 썸네일 (16:9 비율) -->
          <a
            href="/feeds/{ep.feedId}/episodes/{encodeURIComponent(ep.id)}"
            class="relative w-32 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800/80 block self-center sm:self-start"
          >
            {#if ep.thumbnail}
              <img
                src={ep.thumbnail}
                alt={ep.title}
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-slate-600">
                <Play class="w-6 h-6" />
              </div>
            {/if}
            <div class="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition-colors"></div>
            <div class="absolute bottom-1 right-1 p-1 rounded-md bg-slate-950/80 text-white">
              <Play class="w-3 h-3 fill-current text-indigo-400" />
            </div>
          </a>

          <!-- 소속 피드 배지 + 제목 + 메타정보 -->
          <div class="flex-1 min-w-0 flex flex-col justify-between gap-2">
            <div class="space-y-1.5">
              <!-- 소속 피드 배지 -->
              <div class="flex items-center gap-2">
                <a
                  href="/feeds/{ep.feedId}"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-indigo-600/20 text-[11px] font-medium text-indigo-300 border border-slate-700/80 hover:border-indigo-500/40 transition-colors max-w-full"
                >
                  {#if ep.feedImage}
                    <img
                      src={ep.feedImage}
                      alt={ep.feedTitle || ep.feedId}
                      class="w-3.5 h-3.5 rounded-sm object-cover shrink-0"
                    />
                  {:else}
                    <Radio class="w-3 h-3 text-indigo-400 shrink-0" />
                  {/if}
                  <span class="truncate">{ep.feedTitle || ep.feedId}</span>
                </a>
              </div>

              <!-- 에피소드 제목 -->
              <a href="/feeds/{ep.feedId}/episodes/{encodeURIComponent(ep.id)}" class="block">
                <h4 class="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                  {ep.title}
                </h4>
              </a>
            </div>

            <!-- 메타정보 & 새로받기 버튼 -->
            <div class="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono text-[11px]">
              <div class="flex items-center gap-2.5 overflow-hidden">
                {#if ep.pubDate}
                  <span class="truncate">{formatLocaleDate(ep.pubDate)}</span>
                {/if}
                {#if ep.duration}
                  <span class="flex items-center gap-1 text-slate-300 shrink-0">
                    <Clock class="w-3 h-3 text-slate-500" />
                    {ep.duration}
                  </span>
                {/if}
                {#if ep.fileSize}
                  <span class="flex items-center gap-1 text-slate-300 shrink-0">
                    <HardDrive class="w-3 h-3 text-slate-500" />
                    {ep.fileSize}
                  </span>
                {/if}
              </div>

              <button
                type="button"
                disabled={redownloadingKey === itemKey}
                onclick={(e) => handleRedownloadEpisode(ep, e)}
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/40 transition-colors shrink-0 text-[11px]"
                title={t('feedDetail.redownloadEpisode')}
              >
                <RotateCcw class="w-3 h-3 {redownloadingKey === itemKey ? 'animate-spin' : ''}" />
                <span>{t('feedDetail.redownloadEpisode')}</span>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
