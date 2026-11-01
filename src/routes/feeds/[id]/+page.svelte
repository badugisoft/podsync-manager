<script lang="ts">
  import { ArrowLeft, Edit, Trash2, Radio, Clock, HardDrive, Play, Copy, Check, FileText, ExternalLink, Search, X } from '@lucide/svelte';
  import YoutubeIcon from '$lib/components/YoutubeIcon.svelte';
  import RssIcon from '$lib/components/RssIcon.svelte';
  import { stringify } from 'smol-toml';
  import { getNextSyncInfo } from '$lib/utils/schedule';
  import { t, i18n } from '$lib/i18n';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let { data } = $props();

  let deleting = $state(false);
  let copied = $state(false);
  let copiedToml = $state(false);
  let isDescExpanded = $state(false);
  let episodeSearch = $state('');

  let syncInfo = $derived(
    getNextSyncInfo(data.feed.update_period, data.feed.cron_schedule, undefined, undefined, i18n.locale)
  );

  async function copyRssUrl(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const rssUrl = `${data.hostname.replace(/\/+$/, '')}/${data.feedId}.xml`;
    const ok = await copyToClipboard(rssUrl);
    if (ok) {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }

  function feedToml() {
    try {
      return stringify({ feeds: { [data.feedId]: data.feed } });
    } catch {
      return '';
    }
  }

  async function copyFeedToml(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ok = await copyToClipboard(feedToml());
    if (ok) {
      copiedToml = true;
      setTimeout(() => {
        copiedToml = false;
      }, 2000);
    }
  }

  function confirmDelete(e: Event) {
    if (!confirm(t('feedDetail.deleteConfirm', { id: data.feedId }))) {
      e.preventDefault();
      return;
    }
    deleting = true;
  }

  function decodeHtmlEntities(text: string): string {
    if (!text) return '';
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  function formatDescription(text: string) {
    const decoded = decodeHtmlEntities(text);
    const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    return decoded.replace(urlPattern, '<a href="$1" target="_blank" rel="noreferrer" class="text-indigo-400 hover:underline break-all">$1</a>');
  }

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

  let filteredEpisodes = $derived(() => {
    const q = episodeSearch.trim().toLowerCase();
    if (!q) return data.episodes;
    return data.episodes.filter((ep) => ep.title.toLowerCase().includes(q) || ep.description.toLowerCase().includes(q));
  });

  let formatLabel = $derived(
    data.feed.format === 'video'
      ? (data.feed.quality === 'high' ? t('home.formatVideoHigh') : t('home.formatVideoLow'))
      : (data.feed.quality === 'high' ? t('home.formatAudioHigh') : t('home.formatAudioLow'))
  );

  let totalBytes = $derived(() => {
    let sum = 0;
    for (const ep of data.episodes) {
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
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
  <!-- 상단 네비 & 액션 -->
  <div class="flex items-center justify-between">
    <a
      href="/"
      class="inline-flex items-center gap-2 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-sm"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>{t('feedDetail.backToFeeds')}</span>
    </a>

    <div class="flex items-center gap-2">
      <a
        href="/feeds/new?cloneFrom={data.feedId}"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        title={t('feedDetail.cloneFeed')}
      >
        <Copy class="w-3.5 h-3.5" />
        <span>{t('common.clone')}</span>
      </a>
      <a
        href="/feeds/{data.feedId}/edit"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        <Edit class="w-3.5 h-3.5" />
        <span>{t('common.edit')}</span>
      </a>
      <form method="POST" action="?/delete" onsubmit={confirmDelete}>
        <button
          type="submit"
          disabled={deleting}
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors disabled:opacity-50"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>{deleting ? t('common.loading') : t('common.delete')}</span>
        </button>
      </form>
    </div>
  </div>

  <!-- 채널 히어로 카드 (채널 커버 아트 & 공식 명칭) -->
  <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <!-- 채널 커버 이미지 -->
      {#if data.channel?.image}
        <img
          src={data.channel.image}
          alt={data.channel.title || data.feedId}
          class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover bg-slate-950 border border-slate-800 shadow-lg shrink-0"
        />
      {:else}
        <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Radio class="w-12 h-12" />
        </div>
      {/if}

      <!-- 채널 정보 -->
      <div class="flex-1 text-center sm:text-left space-y-3">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-indigo-300 border border-slate-700">
            ID: {data.feedId}
          </span>
          <span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {formatLabel}
          </span>
          {#if data.feed.clean?.keep_last}
            <span class="inline-flex items-center text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
              {t('feedDetail.keepLastBadge', { count: data.feed.clean.keep_last })}
            </span>
          {/if}
          {#if totalSizeFormatted()}
            <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
              <HardDrive class="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('feedDetail.totalSize')}: <strong class="text-white">{totalSizeFormatted()}</strong></span>
            </span>
          {/if}
          {#if syncInfo}
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>{t('feedDetail.nextUpdateBadge', { remaining: syncInfo.remaining, time: syncInfo.nextTime })}</span>
            </span>
          {/if}
        </div>

        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {data.channel?.title || data.feedId}
        </h1>

        {#if data.channel?.description}
          <div class="pt-1">
            <div class="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line {isDescExpanded ? '' : 'line-clamp-3'}">
              {@html formatDescription(data.channel.description)}
            </div>
            {#if data.channel.description.length > 120}
              <button
                type="button"
                onclick={() => (isDescExpanded = !isDescExpanded)}
                class="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 font-medium"
              >
                {isDescExpanded ? t('feedDetail.collapseDesc') : t('feedDetail.expandDesc')}
              </button>
            {/if}
          </div>
        {/if}

        <div class="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <a
            href={data.feed.url}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors"
          >
            <YoutubeIcon class="w-4 h-4 text-rose-400" />
            <span>{t('feedDetail.openYoutube')}</span>
            <ExternalLink class="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- 공식 RSS URL 배너 -->
  <div class="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
    <div class="flex items-center gap-3 overflow-hidden">
      <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
        <RssIcon class="w-5 h-5 text-indigo-400" />
      </div>
      <div class="overflow-hidden">
        <p class="text-xs text-indigo-300 font-medium">{t('feedDetail.rssBannerTitle')}</p>
        <p class="text-xs text-slate-300 font-mono truncate mt-0.5">{data.hostname.replace(/\/+$/, '')}/{data.feedId}.xml</p>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <a
        href="{data.hostname.replace(/\/+$/, '')}/{data.feedId}.xml"
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        <ExternalLink class="w-3.5 h-3.5 text-indigo-400" />
        <span>{t('feedDetail.openRss')}</span>
      </a>
      <button
        onclick={copyRssUrl}
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
      >
        {#if copied}
          <Check class="w-4 h-4 text-emerald-300" />
          <span class="text-emerald-300">{t('common.copied')}</span>
        {:else}
          <Copy class="w-4 h-4 text-white" />
          <span>{t('feedDetail.copyRss')}</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- 해당 피드 TOML 미리보기 (기본 접힘) -->
  <details class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 group">
    <summary class="flex items-center justify-between cursor-pointer select-none">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-slate-400" />
        <h3 class="text-xs font-semibold text-white">{t('feedDetail.feedTomlSnippet')}</h3>
        <span class="text-[11px] text-slate-500 font-mono font-normal">([feeds.{data.feedId}])</span>
      </div>
      <button
        type="button"
        onclick={(e) => copyFeedToml(e)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        {#if copiedToml}
          <Check class="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('common.copied')}</span>
        {:else}
          <Copy class="w-3.5 h-3.5" />
          <span>{t('feedDetail.copyToml')}</span>
        {/if}
      </button>
    </summary>
    <div class="mt-4">
      <pre class="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono overflow-x-auto max-h-72 leading-relaxed">{feedToml()}</pre>
    </div>
  </details>

  <!-- 에피소드 섹션 -->
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-white tracking-tight">{t('feedDetail.episodesList')}</h2>
        <p class="text-xs text-slate-400 mt-0.5">
          {#if totalSizeFormatted()}
            {t('feedDetail.episodesSubtitleWithSize', { count: data.episodes.length, size: totalSizeFormatted() ?? '' })}
          {:else}
            {data.episodes.length === 1
              ? t('home.episodeCountSingle', { count: data.episodes.length })
              : t('home.episodeCountPlural', { count: data.episodes.length })}
          {/if}
        </p>
      </div>

      <!-- 에피소드 검색 입력창 -->
      <div class="relative w-full sm:w-72">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={episodeSearch}
          placeholder={t('feedDetail.searchEpisodes')}
          class="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {#if episodeSearch}
          <button
            onclick={() => (episodeSearch = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>

    {#if data.episodes.length === 0}
      <div class="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <Radio class="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p class="text-sm text-slate-300 font-medium">{t('feedDetail.noEpisodesTitle')}</p>
        <p class="text-xs text-slate-500 mt-1">{t('feedDetail.noEpisodesDesc')}</p>
      </div>
    {:else if filteredEpisodes().length === 0}
      <div class="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <p class="text-sm text-slate-400">{t('feedDetail.noEpisodesMatch', { query: episodeSearch })}</p>
      </div>
    {:else}
      <!-- 에피소드 그리드 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each filteredEpisodes() as ep}
          <a
            href="/feeds/{data.feedId}/episodes/{encodeURIComponent(ep.id)}"
            class="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex gap-4 transition-all hover:bg-slate-800/40 group block"
          >
            <!-- 썸네일 (16:9 비율) -->
            <div class="relative w-32 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800/80">
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
            </div>

            <!-- 제목 및 메타정보 -->
            <div class="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                  {ep.title}
                </h4>
              </div>

              <div class="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono text-[11px]">
                {#if ep.pubDate}
                  <span>{formatLocaleDate(ep.pubDate)}</span>
                {/if}
                {#if ep.duration}
                  <span class="flex items-center gap-1 text-slate-300">
                    <Clock class="w-3 h-3 text-slate-500" />
                    {ep.duration}
                  </span>
                {/if}
                {#if ep.fileSize}
                  <span class="flex items-center gap-1 text-slate-300">
                    <HardDrive class="w-3 h-3 text-slate-500" />
                    {ep.fileSize}
                  </span>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
