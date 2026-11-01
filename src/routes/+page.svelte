<script lang="ts">
  import { Plus, Radio, ExternalLink, HardDrive, Copy, Check, Clock, Layers, Filter, Download } from '@lucide/svelte';
  import YoutubeIcon from '$lib/components/YoutubeIcon.svelte';
  import RssIcon from '$lib/components/RssIcon.svelte';
  import { getNextSyncInfo } from '$lib/utils/schedule';
  import { onMount, onDestroy } from 'svelte';
  import { i18n, t } from '$lib/i18n/index.svelte';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let { data } = $props();

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

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
  <!-- 상단 요약 & S3 용량 위젯 -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- 등록된 피드 수 -->
    <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-400">{t('nav.feeds')}</p>
        <p class="text-3xl font-bold text-white mt-2">
          {data.feeds.length === 1
            ? t('home.feedCountSingle', { count: 1 })
            : t('home.feedCountPlural', { count: data.feeds.length })}
        </p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
        <Radio class="w-6 h-6" />
      </div>
    </div>

    <!-- S3 스토리지 사용량 (수동 계산) -->
    <div class="md:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <HardDrive class="w-5 h-5 text-indigo-400" />
          <h3 class="text-sm font-semibold text-white">{t('home.storageUsage')}</h3>
        </div>
        <button
          onclick={handleCalculateStorage}
          disabled={calculatingStorage}
          class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
        >
          {calculatingStorage ? t('home.storageCalculating') : t('home.storageCalculateBtn')}
        </button>
      </div>

      <div class="mt-4">
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

  <!-- 피드 카드 그리드 -->
  {#if data.feeds.length === 0}
    <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <Radio class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-300">{t('home.noFeedsTitle')}</h3>
      <p class="text-sm text-slate-500 mt-1">{t('home.noFeedsDesc')}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each data.feeds as feed}
        {@const syncInfo = getNextSyncInfo(feed.update_period, feed.cron_schedule, data.uptime, tick, i18n.locale)}
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm">
          <div>
            <!-- 헤더: 채널 커버 이미지 & Feed 정보 (전체 가로폭 확보) -->
            <div class="flex items-start gap-3.5">
              {#if feed.image}
                <img
                  src={feed.image}
                  alt={feed.title || feed.id}
                  class="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800 shadow-md shrink-0"
                  loading="lazy"
                />
              {:else}
                <div class="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <YoutubeIcon class="w-6 h-6" />
                </div>
              {/if}

              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-white text-base leading-snug line-clamp-2 break-words" title={feed.title || feed.id}>
                  {feed.title || feed.id}
                </h3>
                <div class="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 flex-wrap">
                  <span class="font-mono text-indigo-400 truncate">{feed.id}</span>
                  <span class="text-slate-600">·</span>
                  <span class="text-slate-300">
                    {feed.format === 'video'
                      ? (feed.quality === 'high' ? t('home.formatVideoHigh') : t('home.formatVideoLow'))
                      : (feed.quality === 'high' ? t('home.formatAudioHigh') : t('home.formatAudioLow'))}
                  </span>
                </div>
              </div>
            </div>

            <!-- RSS 열기 / 복사하기 버튼 그룹 (독립 행) -->
            <div class="mt-3.5 flex items-center gap-2">
              <a
                href="{data.hostname.replace(/\/+$/, '')}/{feed.id}.xml"
                target="_blank"
                rel="noreferrer"
                class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors"
                title={t('home.openRss')}
              >
                <ExternalLink class="w-3.5 h-3.5 text-orange-400" />
                <span class="text-[11px] font-medium">{t('home.openRss')}</span>
              </a>

              <button
                type="button"
                onclick={() => copyRssUrl(feed.id)}
                class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-colors"
                title={t('home.copyRss')}
              >
                {#if copiedId === feed.id}
                  <Check class="w-3.5 h-3.5 text-emerald-400" />
                  <span class="text-[11px] font-medium text-emerald-400">{t('common.copied')}</span>
                {:else}
                  <Copy class="w-3.5 h-3.5 text-orange-400" />
                  <span class="text-[11px] font-medium">{t('home.copyRss')}</span>
                {/if}
              </button>
            </div>

            <!-- 메타데이터 속성 태그들 -->
            <div class="mt-4 space-y-2 text-xs text-slate-400">
              <div class="flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{t('home.syncInterval')}: <strong class="text-slate-300 font-mono">{feed.update_period || feed.cron_schedule || 'default'}</strong></span>
              </div>
              {#if syncInfo}
                <div class="flex items-center gap-1.5 text-indigo-300 bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 text-[11px]">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span>{t('home.nextSync')}: <strong class="text-white">{syncInfo.remaining}</strong> ({syncInfo.nextTime})</span>
                </div>
              {/if}
              {#if feed.clean?.keep_last}
                <div class="flex items-center gap-1.5">
                  <Layers class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{t('feedForm.cleanKeepLast')}: <strong class="text-slate-300">{feed.clean.keep_last}</strong></span>
                </div>
              {/if}
              {#if feed.filters?.min_duration}
                <div class="flex items-center gap-1.5">
                  <Filter class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Min: <strong class="text-slate-300">{feed.filters.min_duration}s</strong></span>
                </div>
              {/if}
            </div>

            <!-- YouTube URL 링크 -->
            <div class="mt-4 pt-3 border-t border-slate-800/80">
              <a
                href={feed.url}
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-full"
              >
                <span>{t('episodeDetail.openOnYoutube')}</span>
                <ExternalLink class="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <!-- 하단 액션 버튼들 -->
          <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
            <a
              href="/feeds/{feed.id}"
              class="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-600/20 transition-colors"
            >
              {t('feedDetail.episodesList')}
            </a>
            <a
              href="/feeds/new?cloneFrom={feed.id}"
              class="py-2 px-3 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              title={t('feedDetail.cloneFeed')}
            >
              {t('common.clone')}
            </a>
            <a
              href="/feeds/{feed.id}/edit"
              class="py-2 px-3 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {t('common.edit')}
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
