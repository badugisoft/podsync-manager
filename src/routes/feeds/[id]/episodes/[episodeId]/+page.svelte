<script lang="ts">
  import { ArrowLeft, Clock, HardDrive, Calendar, Music, ExternalLink, FastForward, Rewind, Radio } from '@lucide/svelte';
  import { t, i18n } from '$lib/i18n';

  let { data } = $props();

  let audioElement = $state<HTMLAudioElement | null>(null);
  let playbackRate = $state(1.0);

  const rates = [1.0, 1.25, 1.5, 1.75, 2.0];

  function setRate(rate: number) {
    playbackRate = rate;
    if (audioElement) {
      audioElement.playbackRate = rate;
    }
  }

  function skipTime(seconds: number) {
    if (audioElement) {
      audioElement.currentTime = Math.max(0, audioElement.currentTime + seconds);
    }
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

  // 텍스트 내 HTML 엔티티 디코딩 및 URL 하이퍼링크 변환
  function renderDescription(text: string) {
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
      return new Date(dateStr).toLocaleString(locale);
    } catch {
      return dateStr;
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  <!-- 상단 뒤로가기 & 피드 브레드크럼 -->
  <div class="flex items-center gap-3">
    <a
      href="/feeds/{data.feedId}"
      class="inline-flex items-center gap-2 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-sm"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>{t('episodeDetail.backToFeed', { title: data.channel?.title || data.feedId })}</span>
    </a>
  </div>

  <!-- 플레이어 및 상세 카드 -->
  <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-2xl space-y-8">
    <div class="flex flex-col md:flex-row gap-6 items-center md:items-start">
      <!-- 대형 썸네일 -->
      <div class="relative w-full sm:w-64 md:w-72 aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl shrink-0">
        {#if data.episode.thumbnail}
          <img
            src={data.episode.thumbnail}
            alt={data.episode.title}
            class="w-full h-full object-cover"
          />
        {:else}
          <div class="w-full h-full flex items-center justify-center text-slate-600">
            <Music class="w-16 h-16" />
          </div>
        {/if}
      </div>

      <!-- 에피소드 제목 및 메타정보 -->
      <div class="flex-1 w-full space-y-4 text-center md:text-left">
        <div>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-2">
            {data.feedId}
          </span>
          <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {data.episode.title}
          </h1>
        </div>

        <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 font-mono">
          {#if data.episode.pubDate}
            <div class="flex items-center gap-1.5">
              <Calendar class="w-4 h-4 text-slate-500" />
              <span>{formatLocaleDate(data.episode.pubDate)}</span>
            </div>
          {/if}
          {#if data.episode.duration}
            <div class="flex items-center gap-1.5 text-slate-300">
              <Clock class="w-4 h-4 text-slate-500" />
              <span>{data.episode.duration}</span>
            </div>
          {/if}
          {#if data.episode.fileSize}
            <div class="flex items-center gap-1.5 text-slate-300">
              <HardDrive class="w-4 h-4 text-slate-500" />
              <span>{data.episode.fileSize}</span>
            </div>
          {/if}
        </div>

        <!-- 오디오 재생 플레이어 -->
        <div class="pt-3 space-y-3">
          <audio
            bind:this={audioElement}
            controls
            class="w-full h-12 rounded-xl focus:outline-none"
            preload="metadata"
          >
            <source src={data.episode.audioUrl} type="audio/mpeg" />
            {t('episodeDetail.audioNotSupported')}
          </audio>

          <!-- 컨트롤 보조 버튼들 (재생속도, 15초 이동) -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <!-- 15초 앞/뒤 건너뛰기 -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => skipTime(-15)}
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={t('episodeDetail.skip15BackwardTitle')}
              >
                <Rewind class="w-3.5 h-3.5" />
                <span>{t('episodeDetail.skip15Backward')}</span>
              </button>
              <button
                type="button"
                onclick={() => skipTime(15)}
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={t('episodeDetail.skip15ForwardTitle')}
              >
                <FastForward class="w-3.5 h-3.5" />
                <span>{t('episodeDetail.skip15Forward')}</span>
              </button>
            </div>

            <!-- 재생 속도 조절 -->
            <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span class="text-[11px] text-slate-500 px-1.5 select-none">{t('episodeDetail.playbackSpeed')}</span>
              {#each rates as r}
                <button
                  type="button"
                  onclick={() => setRate(r)}
                  class="px-2 py-0.5 rounded text-[11px] font-mono transition-colors {playbackRate === r ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}"
                >
                  {r}x
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- 직접 파일 다운로드 링크 -->
        <div class="pt-1">
          <a
            href={data.episode.audioUrl}
            target="_blank"
            rel="noreferrer"
            download
            class="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            <span>{t('episodeDetail.directDownload')}</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>

    <!-- 에피소드 본문 상세 설명 -->
    {#if data.episode.description}
      <div class="pt-6 border-t border-slate-800 space-y-3">
        <h3 class="text-sm font-semibold text-slate-200">{t('episodeDetail.episodeDescription')}</h3>
        <div class="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 max-h-[500px] overflow-y-auto font-sans">
          {@html renderDescription(data.episode.description)}
        </div>
      </div>
    {/if}

    <!-- 소속 피드(채널) 정보 및 설명 -->
    {#if data.channel?.description}
      <div class="pt-6 border-t border-slate-800 space-y-3">
        <div class="flex items-center gap-2">
          <Radio class="w-4 h-4 text-indigo-400" />
          <h3 class="text-sm font-semibold text-slate-200">{t('episodeDetail.aboutFeed', { title: data.channel.title || data.feedId })}</h3>
        </div>
        <div class="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 font-sans">
          {@html renderDescription(data.channel.description)}
        </div>
      </div>
    {/if}
  </div>
</div>
