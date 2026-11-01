<script lang="ts">
  import { untrack } from 'svelte';
  import { stringify } from 'smol-toml';
  import { Sparkles, HelpCircle, Check, AlertCircle, Loader2, FileText, Copy, Radio, Music, Video, Tv } from '@lucide/svelte';
  import YoutubeIcon from './YoutubeIcon.svelte';
  import type { FeedConfig } from '$lib/types/config';
  import { t } from '$lib/i18n';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let {
    feed = null,
    isEdit = false,
    error = null,
    saving = false
  }: {
    feed?: FeedConfig | null;
    isEdit?: boolean;
    error?: string | null;
    saving?: boolean;
  } = $props();

  // 0. 플랫폼 선택 상태
  type PlatformType = 'youtube' | 'soundcloud' | 'vimeo' | 'twitch';
  let selectedPlatform = $state<PlatformType>('youtube');

  function detectPlatform(targetUrl: string): PlatformType {
    const lower = (targetUrl || '').toLowerCase();
    if (lower.includes('soundcloud.com')) return 'soundcloud';
    if (lower.includes('vimeo.com')) return 'vimeo';
    if (lower.includes('twitch.tv')) return 'twitch';
    return 'youtube';
  }

  // 1. 기본 정보 & 중복 체크 상태
  let feedId = $state('');
  let checkingId = $state(false);
  let idCheckResult = $state<{ valid: boolean; message: string } | null>(null);
  let checkTimer: NodeJS.Timeout | null = null;

  function handleFeedIdInput() {
    if (checkTimer) clearTimeout(checkTimer);
    const trimmed = feedId.trim().toLowerCase();
    feedId = trimmed;

    if (!trimmed) {
      idCheckResult = null;
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      idCheckResult = { valid: false, message: t('feedForm.feedIdRegexError') };
      return;
    }

    checkingId = true;
    checkTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/feeds/check-id?id=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        idCheckResult = { valid: data.valid, message: data.message };
      } catch {
        idCheckResult = null;
      } finally {
        checkingId = false;
      }
    }, 250);
  }
  let url = $state('');
  let format = $state<'audio' | 'video'>('audio');
  let quality = $state<'low' | 'high'>('low');
  let opml = $state(true);

  // 2. 동기화 주기 (프리셋 + 커스텀)
  const periodPresetValues = ['5m', '10m', '15m', '30m', '1h', '2h', '6h', '12h', '1d', 'custom'];
  let periodMode = $state('15m');
  let customPeriod = $state('');

  // 3. 페이지 사이즈 (프리셋 + 커스텀)
  const pageSizePresetValues = ['1', '3', '5', '10', '15', '20', '30', 'custom'];
  let pageSizeMode = $state('10');
  let customPageSize = $state('10');

  // 4. 보관 개수 clean.keep_last (프리셋 + 커스텀)
  const keepLastPresetValues = ['', '1', '3', '5', '10', '20', 'custom'];
  let keepLastMode = $state('5');
  let customKeepLast = $state('');

  // 5. 최소 / 최대 재생 시간 filters.min_duration / filters.max_duration (프리셋 + 커스텀)
  const minDurationPresetValues = ['', '60', '180', '300', '600', 'custom'];
  let minDurationMode = $state('180');
  let customMinDuration = $state('');

  const maxDurationPresetValues = ['', '600', '1800', '3600', '7200', 'custom'];
  let maxDurationMode = $state('');
  let customMaxDuration = $state('');

  // 5-1. 고급 필터 풀스펙
  let filterTitle = $state('');
  let filterNotTitle = $state('');
  let filterDescription = $state('');
  let filterNotDescription = $state('');

  // 5-2. 커스텀 팟캐스트 메타데이터 (custom) 풀스펙
  let customCoverArt = $state('');
  let customTitle = $state('');
  let customDescription = $state('');
  let customAuthor = $state('');
  let customCategory = $state('');
  let customSubcategories = $state('');
  let customExplicit = $state(false);
  let customLangTag = $state('');
  let customOwnerName = $state('');
  let customOwnerEmail = $state('');

  // 6. 유튜브 친절 옵션 (yt-dlp 인자 조합)
  let langPref = $state('ko'); // ko, en, ja, none, custom
  let customLang = $state('');

  let playerClient = $state('android'); // android, ios, web, none, custom
  let customClient = $state('');

  let excludeLive = $state(true); // !is_live
  let shortsFilter = $state<'exclude' | 'only' | 'all'>('all'); // all, exclude, only

  // 포맷 스트림 최적화 (-f ...)
  let formatStream = $state('18'); // 18, bestaudio, default, custom
  let customFormatStream = $state('');

  let extraArgs = $state(''); // 기타 사용자 직접 입력 인자

  function initFromFeed(targetFeed: FeedConfig | null) {
    if (targetFeed) {
      selectedPlatform = detectPlatform(targetFeed.url || '');
      url = targetFeed.url || '';
      format = targetFeed.format || 'audio';
      quality = targetFeed.quality || 'low';
      opml = targetFeed.opml !== false;

      // 주기
      const p = targetFeed.update_period || targetFeed.cron_schedule || '15m';
      if (periodPresetValues.includes(p)) {
        periodMode = p;
      } else {
        periodMode = 'custom';
        customPeriod = p;
      }

      // 페이지 사이즈
      const ps = String(targetFeed.page_size ?? 10);
      if (pageSizePresetValues.includes(ps)) {
        pageSizeMode = ps;
      } else {
        pageSizeMode = 'custom';
        customPageSize = ps;
      }

      // 보관 개수
      if (targetFeed.clean?.keep_last !== undefined) {
        const kl = String(targetFeed.clean.keep_last);
        if (keepLastPresetValues.includes(kl)) {
          keepLastMode = kl;
        } else {
          keepLastMode = 'custom';
          customKeepLast = kl;
        }
      } else {
        keepLastMode = '';
      }

      // 최소 재생 시간
      if (targetFeed.filters?.min_duration !== undefined) {
        const md = String(targetFeed.filters.min_duration);
        if (minDurationPresetValues.includes(md)) {
          minDurationMode = md;
        } else {
          minDurationMode = 'custom';
          customMinDuration = md;
        }
      } else {
        minDurationMode = '';
      }

      // 최대 재생 시간
      if (targetFeed.filters?.max_duration !== undefined) {
        const xd = String(targetFeed.filters.max_duration);
        if (maxDurationPresetValues.includes(xd)) {
          maxDurationMode = xd;
        } else {
          maxDurationMode = 'custom';
          customMaxDuration = xd;
        }
      } else {
        maxDurationMode = '';
        customMaxDuration = '';
      }

      // 고급 필터
      filterTitle = targetFeed.filters?.title || '';
      filterNotTitle = targetFeed.filters?.not_title || '';
      filterDescription = targetFeed.filters?.description || '';
      filterNotDescription = targetFeed.filters?.not_description || '';

      // 커스텀 메타데이터
      customCoverArt = targetFeed.custom?.cover_art || '';
      customTitle = targetFeed.custom?.title || '';
      customDescription = targetFeed.custom?.description || '';
      customAuthor = targetFeed.custom?.author || '';
      customCategory = targetFeed.custom?.category || '';
      customSubcategories = targetFeed.custom?.subcategories?.join(', ') || '';
      customExplicit = targetFeed.custom?.explicit === true;
      customLangTag = targetFeed.custom?.lang || '';
      customOwnerName = targetFeed.custom?.owner_name || '';
      customOwnerEmail = targetFeed.custom?.owner_email || '';

      // yt-dlp 인자 파싱
      const args = targetFeed.youtube_dl_args || [];
      const remaining: string[] = [];
      langPref = 'ko';
      playerClient = 'android';
      excludeLive = true;
      shortsFilter = 'all';
      formatStream = '18';

      for (let i = 0; i < args.length; i++) {
        const curr = args[i];
        if (curr === '-S' && i + 1 < args.length && args[i + 1].startsWith('lang:')) {
          const l = args[i + 1].replace('lang:', '');
          if (['ko', 'en', 'ja'].includes(l)) {
            langPref = l;
          } else {
            langPref = 'custom';
            customLang = l;
          }
          i++;
        } else if (curr === '--extractor-args' && i + 1 < args.length && args[i + 1].startsWith('youtube:player-client=')) {
          const c = args[i + 1].replace('youtube:player-client=', '');
          if (['android', 'ios', 'web'].includes(c)) {
            playerClient = c;
          } else {
            playerClient = 'custom';
            customClient = c;
          }
          i++;
        } else if (curr === '--match-filter' && i + 1 < args.length) {
          const mf = args[i + 1];
          if (mf.includes('!is_live')) {
            excludeLive = true;
          }
          if (mf.includes('original_url!*=/shorts/')) {
            shortsFilter = 'exclude';
          } else if (mf.includes('original_url*=/shorts/')) {
            shortsFilter = 'only';
          }
          const cleaned = mf
            .replace('!is_live', '')
            .replace('original_url!*=/shorts/', '')
            .replace('original_url*=/shorts/', '')
            .replace(/^(\s*&\s*)+|(\s*&\s*)+$/g, '')
            .replace(/\s*&\s*&\s*/g, ' & ')
            .trim();
          if (cleaned) {
            remaining.push('--match-filter', cleaned);
          }
          i++;
        } else if (curr === '-f' && i + 1 < args.length) {
          const f = args[i + 1];
          if (f === '18') {
            formatStream = '18';
          } else if (f === 'ba' || f === 'ba/b' || f === 'bestaudio') {
            formatStream = 'bestaudio';
          } else {
            formatStream = 'custom';
            customFormatStream = f;
          }
          i++;
        } else {
          remaining.push(curr);
        }
      }

      extraArgs = remaining.join('\n');
    } else {
      // 기본 신규 피드 값
      selectedPlatform = 'youtube';
      feedId = '';
      url = '';
      format = 'audio';
      quality = 'low';
      opml = true;
      periodMode = '15m';
      pageSizeMode = '10';
      keepLastMode = '5';
      minDurationMode = '180';
      maxDurationMode = '';
      customMaxDuration = '';
      filterTitle = '';
      filterNotTitle = '';
      filterDescription = '';
      filterNotDescription = '';
      customCoverArt = '';
      customTitle = '';
      customDescription = '';
      customAuthor = '';
      customCategory = '';
      customSubcategories = '';
      customExplicit = false;
      customLangTag = '';
      customOwnerName = '';
      customOwnerEmail = '';
      langPref = 'ko';
      playerClient = 'android';
      excludeLive = true;
      shortsFilter = 'all';
      formatStream = '18';
      extraArgs = '';
    }

    // 스냅샷 보존
    initial = {
      platform: selectedPlatform,
      url,
      format,
      quality,
      opml,
      period: periodMode === 'custom' ? customPeriod : periodMode,
      pageSize: pageSizeMode === 'custom' ? customPageSize : pageSizeMode,
      keepLast: keepLastMode === 'custom' ? customKeepLast : keepLastMode,
      minDuration: minDurationMode === 'custom' ? customMinDuration : minDurationMode,
      maxDuration: maxDurationMode === 'custom' ? customMaxDuration : maxDurationMode,
      filterTitle,
      filterNotTitle,
      filterDescription,
      filterNotDescription,
      customCoverArt,
      customTitle,
      customDescription,
      customAuthor,
      customCategory,
      customSubcategories,
      customExplicit,
      customLangTag,
      customOwnerName,
      customOwnerEmail,
      langPref,
      customLang,
      playerClient,
      customClient,
      excludeLive,
      shortsFilter,
      formatStream,
      customFormatStream,
      extraArgs
    };
  }

  let initial = $state({
    platform: 'youtube' as PlatformType,
    url: '',
    format: 'audio',
    quality: 'low',
    opml: true,
    period: '15m',
    pageSize: '10',
    keepLast: '5',
    minDuration: '180',
    maxDuration: '',
    filterTitle: '',
    filterNotTitle: '',
    filterDescription: '',
    filterNotDescription: '',
    customCoverArt: '',
    customTitle: '',
    customDescription: '',
    customAuthor: '',
    customCategory: '',
    customSubcategories: '',
    customExplicit: false,
    customLangTag: '',
    customOwnerName: '',
    customOwnerEmail: '',
    langPref: 'ko',
    customLang: '',
    playerClient: 'android',
    customClient: '',
    excludeLive: true,
    shortsFilter: 'all' as 'exclude' | 'only' | 'all',
    formatStream: '18',
    customFormatStream: '',
    extraArgs: ''
  });

  export function reset() {
    initFromFeed(feed);
  }

  // feed 객체가 실제로 변경된 경우에만 재초기화 (폼 입력 상태 변경 시 재실행 방지)
  let lastFeed: FeedConfig | null | undefined = undefined;
  $effect.pre(() => {
    if (feed !== lastFeed) {
      lastFeed = feed;
      untrack(() => {
        initFromFeed(feed);
      });
    }
  });

  // 전송용 계산된 값들
  let finalPeriod = $derived(periodMode === 'custom' ? customPeriod : periodMode);
  let finalPageSize = $derived(pageSizeMode === 'custom' ? customPageSize : pageSizeMode);
  let finalKeepLast = $derived(keepLastMode === 'custom' ? customKeepLast : keepLastMode);
  let finalMinDuration = $derived(minDurationMode === 'custom' ? customMinDuration : minDurationMode);
  let finalMaxDuration = $derived(maxDurationMode === 'custom' ? customMaxDuration : maxDurationMode);

  // 필드별 변경 감지 상태들
  let isModifiedPlatform = $derived(selectedPlatform !== initial.platform);
  let isModifiedUrl = $derived(url !== initial.url);
  let isModifiedFormat = $derived(format !== initial.format);
  let isModifiedQuality = $derived(quality !== initial.quality);
  let isModifiedOpml = $derived(opml !== initial.opml);
  let isModifiedPeriod = $derived(finalPeriod !== initial.period);
  let isModifiedPageSize = $derived(finalPageSize !== initial.pageSize);
  let isModifiedKeepLast = $derived(finalKeepLast !== initial.keepLast);
  let isModifiedMinDuration = $derived(finalMinDuration !== initial.minDuration);
  let isModifiedMaxDuration = $derived(finalMaxDuration !== initial.maxDuration);
  let isModifiedFilterTitle = $derived(filterTitle !== initial.filterTitle);
  let isModifiedFilterNotTitle = $derived(filterNotTitle !== initial.filterNotTitle);
  let isModifiedFilterDesc = $derived(filterDescription !== initial.filterDescription);
  let isModifiedFilterNotDesc = $derived(filterNotDescription !== initial.filterNotDescription);
  let isModifiedCover = $derived(customCoverArt !== initial.customCoverArt);
  let isModifiedCustomTitle = $derived(customTitle !== initial.customTitle);
  let isModifiedCustomDesc = $derived(customDescription !== initial.customDescription);
  let isModifiedAuthor = $derived(customAuthor !== initial.customAuthor);
  let isModifiedCategory = $derived(customCategory !== initial.customCategory);
  let isModifiedSubcategories = $derived(customSubcategories !== initial.customSubcategories);
  let isModifiedExplicit = $derived(customExplicit !== initial.customExplicit);
  let isModifiedLangTag = $derived(customLangTag !== initial.customLangTag);
  let isModifiedOwnerEmail = $derived(customOwnerEmail !== initial.customOwnerEmail);
  let isModifiedLangPref = $derived(langPref !== initial.langPref || (langPref === 'custom' && customLang !== initial.customLang));
  let isModifiedPlayerClient = $derived(playerClient !== initial.playerClient || (playerClient === 'custom' && customClient !== initial.customClient));
  let isModifiedFormatStream = $derived(formatStream !== initial.formatStream || (formatStream === 'custom' && customFormatStream !== initial.customFormatStream));
  let isModifiedExcludeLive = $derived(excludeLive !== initial.excludeLive);
  let isModifiedShortsFilter = $derived(shortsFilter !== initial.shortsFilter);
  let isModifiedExtraArgs = $derived(extraArgs !== initial.extraArgs);

  let modifiedCount = $derived(
    [
      isModifiedPlatform,
      isModifiedUrl,
      isModifiedFormat,
      isModifiedQuality,
      isModifiedOpml,
      isModifiedPeriod,
      isModifiedPageSize,
      isModifiedKeepLast,
      isModifiedMinDuration,
      isModifiedMaxDuration,
      isModifiedFilterTitle,
      isModifiedFilterNotTitle,
      isModifiedFilterDesc,
      isModifiedFilterNotDesc,
      isModifiedCover,
      isModifiedCustomTitle,
      isModifiedCustomDesc,
      isModifiedAuthor,
      isModifiedCategory,
      isModifiedSubcategories,
      isModifiedExplicit,
      isModifiedLangTag,
      isModifiedOwnerEmail,
      isModifiedLangPref,
      isModifiedPlayerClient,
      isModifiedFormatStream,
      isModifiedExcludeLive,
      isModifiedShortsFilter,
      isModifiedExtraArgs
    ].filter(Boolean).length
  );

  export function getModifiedCount() {
    return modifiedCount;
  }

  // yt-dlp 인자 최종 조합
  let combinedYtArgs = $derived(() => {
    const lines: string[] = [];
    // 1. 언어
    const selectedLang = langPref === 'custom' ? customLang : langPref;
    if (selectedLang && selectedLang !== 'none') {
      lines.push('-S', `lang:${selectedLang}`);
    }
    // 2. 플레이어 클라이언트
    const selectedClient = playerClient === 'custom' ? customClient : playerClient;
    if (selectedClient && selectedClient !== 'none') {
      lines.push('--extractor-args', `youtube:player-client=${selectedClient}`);
    }
    // 3. 필터 조합 (--match-filter)
    const matchFilters: string[] = [];
    if (excludeLive) {
      matchFilters.push('!is_live');
    }
    if (shortsFilter === 'exclude') {
      matchFilters.push('original_url!*=/shorts/');
    } else if (shortsFilter === 'only') {
      matchFilters.push('original_url*=/shorts/');
    }
    if (matchFilters.length > 0) {
      lines.push('--match-filter', matchFilters.join(' & '));
    }
    // 4. 스트림 포맷 최적화 (-f)
    if (formatStream === '18') {
      lines.push('-f', '18');
    } else if (formatStream === 'bestaudio') {
      lines.push('-f', 'ba/b');
    } else if (formatStream === 'custom' && customFormatStream.trim()) {
      lines.push('-f', customFormatStream.trim());
    }
    // 5. 추가 인자
    if (extraArgs.trim()) {
      for (const arg of extraArgs.split('\n')) {
        const trimmed = arg.trim();
        if (trimmed) lines.push(trimmed);
      }
    }
    return lines.join('\n');
  });

  let copiedFeedToml = $state(false);

  // 실시간 피드 TOML 스니펫 계산
  let liveFeedToml = $derived(() => {
    const fId = feedId.trim() || (feed ? 'feed' : 'my_feed');
    const fObj: Record<string, unknown> = {
      url: url || 'https://www.youtube.com/...',
      format,
      quality,
      page_size: Number(finalPageSize) || 10,
      opml
    };

    if (finalPeriod) {
      fObj.update_period = finalPeriod;
    }
    if (finalKeepLast) {
      fObj.clean = { keep_last: Number(finalKeepLast) };
    }

    // filters 객체 (값 있는 것만 포함)
    const filtersObj: Record<string, unknown> = {};
    if (finalMinDuration) filtersObj.min_duration = Number(finalMinDuration);
    if (finalMaxDuration) filtersObj.max_duration = Number(finalMaxDuration);
    if (filterTitle.trim()) filtersObj.title = filterTitle.trim();
    if (filterNotTitle.trim()) filtersObj.not_title = filterNotTitle.trim();
    if (filterDescription.trim()) filtersObj.description = filterDescription.trim();
    if (filterNotDescription.trim()) filtersObj.not_description = filterNotDescription.trim();

    if (Object.keys(filtersObj).length > 0) {
      fObj.filters = filtersObj;
    }

    // custom 객체 (값 있는 것만 포함)
    const customObj: Record<string, unknown> = {};
    if (customCoverArt.trim()) customObj.cover_art = customCoverArt.trim();
    if (customTitle.trim()) customObj.title = customTitle.trim();
    if (customDescription.trim()) customObj.description = customDescription.trim();
    if (customAuthor.trim()) customObj.author = customAuthor.trim();
    if (customCategory.trim()) customObj.category = customCategory.trim();
    if (customSubcategories.trim()) {
      customObj.subcategories = customSubcategories.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (customExplicit) customObj.explicit = true;
    if (customLangTag.trim()) customObj.lang = customLangTag.trim();
    if (customOwnerName.trim()) customObj.owner_name = customOwnerName.trim();
    if (customOwnerEmail.trim()) customObj.owner_email = customOwnerEmail.trim();

    if (Object.keys(customObj).length > 0) {
      fObj.custom = customObj;
    }

    if (selectedPlatform === 'youtube') {
      const currentYtArgs = combinedYtArgs().split('\n').map((a) => a.trim()).filter(Boolean);
      if (currentYtArgs.length > 0) {
        fObj.youtube_dl_args = currentYtArgs;
      }
    }

    try {
      return stringify({ feeds: { [fId]: fObj } });
    } catch {
      return '';
    }
  });

  async function copyLiveFeedToml(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const success = await copyToClipboard(liveFeedToml());
    if (success) {
      copiedFeedToml = true;
      setTimeout(() => {
        copiedFeedToml = false;
      }, 2000);
    }
  }
</script>

{#if error}
  <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-4 rounded-xl">
    {error}
  </div>
{/if}

<div class="space-y-6">
  <!-- 플랫폼 선택 (선택 가능) -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-white">{t('feedForm.sourcePlatform')}</h3>
        {#if isModifiedPlatform}
          <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
            {t('common.modified')}
          </span>
        {/if}
      </div>
      <span class="text-xs text-slate-400">{t('feedForm.sourcePlatformDesc')}</span>
    </div>

    <!-- Hidden form field -->
    <input type="hidden" name="platform" value={selectedPlatform} />

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- YouTube (선택 가능) -->
      <button
        type="button"
        onclick={() => (selectedPlatform = 'youtube')}
        class="flex items-center justify-between gap-2.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer {selectedPlatform === 'youtube'
          ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30 shadow-sm'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <YoutubeIcon class="w-5 h-5 text-rose-400 shrink-0" />
          <span class="text-sm font-medium text-white truncate">YouTube</span>
        </div>
        {#if selectedPlatform === 'youtube'}
          <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white shrink-0">
            <Check class="w-2.5 h-2.5 stroke-[3]" />
          </span>
        {/if}
      </button>

      <!-- SoundCloud (비활성화) -->
      <button
        type="button"
        disabled
        class="flex items-center justify-between gap-2.5 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/30 text-left opacity-40 cursor-not-allowed select-none"
        title={t('feedForm.comingSoon')}
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <Music class="w-5 h-5 text-orange-400/70 shrink-0" />
          <span class="text-sm font-medium text-slate-400 truncate">SoundCloud</span>
        </div>
        <span class="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded shrink-0 font-medium border border-slate-700/50">
          {t('feedForm.comingSoon')}
        </span>
      </button>

      <!-- Vimeo (비활성화) -->
      <button
        type="button"
        disabled
        class="flex items-center justify-between gap-2.5 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/30 text-left opacity-40 cursor-not-allowed select-none"
        title={t('feedForm.comingSoon')}
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <Video class="w-5 h-5 text-sky-400/70 shrink-0" />
          <span class="text-sm font-medium text-slate-400 truncate">Vimeo</span>
        </div>
        <span class="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded shrink-0 font-medium border border-slate-700/50">
          {t('feedForm.comingSoon')}
        </span>
      </button>

      <!-- Twitch (비활성화) -->
      <button
        type="button"
        disabled
        class="flex items-center justify-between gap-2.5 p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/30 text-left opacity-40 cursor-not-allowed select-none"
        title={t('feedForm.comingSoon')}
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <Tv class="w-5 h-5 text-purple-400/70 shrink-0" />
          <span class="text-sm font-medium text-slate-400 truncate">Twitch</span>
        </div>
        <span class="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded shrink-0 font-medium border border-slate-700/50">
          {t('feedForm.comingSoon')}
        </span>
      </button>
    </div>
  </div>

  <!-- OPML 내보내기 포함 옵션 -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
        <Radio class="w-4 h-4" />
      </div>
      <div>
        <label for="opmlToggle" class="text-sm font-medium text-white cursor-pointer select-none flex items-center gap-1.5">
          <span>{t('feedForm.opmlIncludeLabel')}</span>
          {#if isModifiedOpml}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
              {t('common.modified')}
            </span>
          {/if}
        </label>
      </div>
    </div>
    <input
      id="opmlToggle"
      type="checkbox"
      name="opml"
      bind:checked={opml}
      class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
    />
  </div>

  <!-- 1. 기본 정보 섹션 -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
    <div>
      <h3 class="text-sm font-semibold text-white">{t('feedForm.basicInfo')}</h3>
      <p class="text-xs text-slate-400 mt-0.5">{t('feedForm.basicInfoDesc')}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      {#if !isEdit}
        <div class="md:col-span-2">
          <div class="flex items-center justify-between mb-1">
            <label for="feedId" class="block text-xs font-medium text-slate-300">
              {t('feedForm.feedIdLabel')} <span class="text-rose-400">*</span>
            </label>
            {#if checkingId}
              <span class="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 class="w-3 h-3 animate-spin" />
                <span>{t('feedForm.feedIdChecking')}</span>
              </span>
            {:else if idCheckResult}
              <span class="inline-flex items-center gap-1 text-[11px] {idCheckResult.valid ? 'text-emerald-400' : 'text-rose-400 font-medium'}">
                {#if idCheckResult.valid}
                  <Check class="w-3 h-3" />
                {:else}
                  <AlertCircle class="w-3 h-3" />
                {/if}
                <span>{idCheckResult.message}</span>
              </span>
            {/if}
          </div>
          <input
            id="feedId"
            name="feedId"
            type="text"
            required
            pattern="[a-z0-9_]+"
            bind:value={feedId}
            oninput={handleFeedIdInput}
            placeholder={t('feedForm.feedIdPlaceholder')}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {idCheckResult ? (idCheckResult.valid ? 'border-emerald-500/80 focus:ring-emerald-500' : 'border-rose-500/80 focus:ring-rose-500') : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.feedIdHelp')}</p>
        </div>
      {/if}

      <div class="md:col-span-2">
        <label for="url" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.sourceUrlLabel')} <span class="text-rose-400">*</span>
          {#if isModifiedUrl}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          bind:value={url}
          placeholder={t('feedForm.sourceUrlPlaceholder')}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedUrl ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm"
        />
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.sourceUrlHelp')}</p>
      </div>

      <div>
        <label for="format" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.mediaFormatLabel')}
          {#if isModifiedFormat}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="format"
          name="format"
          bind:value={format}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedFormat ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          <option value="audio">{t('feedForm.formatAudioOption')}</option>
          <option value="video">{t('feedForm.formatVideoOption')}</option>
        </select>
      </div>

      <div>
        <label for="quality" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.qualityLabel')}
          {#if isModifiedQuality}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="quality"
          name="quality"
          bind:value={quality}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedQuality ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          <option value="low">{t('feedForm.qualityLowOption')}</option>
          <option value="high">{t('feedForm.qualityHighOption')}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- 2. 동기화 주기 및 다운로드 수량 -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
    <div>
      <h3 class="text-sm font-semibold text-white">{t('feedForm.syncSection')}</h3>
      <p class="text-xs text-slate-400 mt-0.5">{t('feedForm.syncSectionDesc')}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- 동기화 주기 -->
      <div>
        <label for="periodSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.updatePeriodLabel')}
          {#if isModifiedPeriod}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="periodSelect"
          bind:value={periodMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedPeriod ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each periodPresetValues as val}
            <option value={val}>{t(`presets.period.${val}`)}</option>
          {/each}
        </select>

        {#if periodMode === 'custom'}
          <div class="mt-2">
            <input
              type="text"
              bind:value={customPeriod}
              placeholder={t('feedForm.customPeriodPlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 font-mono text-xs focus:outline-none"
            />
          </div>
        {/if}
        <input type="hidden" name="updatePeriod" value={finalPeriod} />
      </div>

      <!-- 페이지 사이즈 -->
      <div>
        <label for="pageSizeSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.pageSizeLabel')}
          {#if isModifiedPageSize}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="pageSizeSelect"
          bind:value={pageSizeMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedPageSize ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each pageSizePresetValues as val}
            <option value={val}>{t(`presets.pageSize.${val}`)}</option>
          {/each}
        </select>

        {#if pageSizeMode === 'custom'}
          <div class="mt-2">
            <input
              type="number"
              min="1"
              max="200"
              bind:value={customPageSize}
              placeholder={t('feedForm.customPageSizePlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>
        {/if}
        <input type="hidden" name="pageSize" value={finalPageSize} />
      </div>
    </div>
  </div>

  <!-- 3. 보관 및 필터 (친절한 프리셋) -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
    <div>
      <h3 class="text-sm font-semibold text-white">{t('feedForm.cleanupSection')}</h3>
      <p class="text-xs text-slate-400 mt-0.5">{t('feedForm.cleanupSectionDesc')}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- 보관 개수 -->
      <div>
        <label for="keepLastSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.keepLastLabel')}
          {#if isModifiedKeepLast}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="keepLastSelect"
          bind:value={keepLastMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedKeepLast ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each keepLastPresetValues as val}
            <option value={val}>{t(`presets.keepLast.${val}`)}</option>
          {/each}
        </select>

        {#if keepLastMode === 'custom'}
          <div class="mt-2">
            <input
              type="number"
              min="1"
              bind:value={customKeepLast}
              placeholder={t('feedForm.customKeepLastPlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.keepLastHelp')}</p>
        <input type="hidden" name="keepLast" value={finalKeepLast} />
      </div>

      <!-- 최소 재생 시간 -->
      <div>
        <label for="minDurationSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.minDurationLabel')}
          {#if isModifiedMinDuration}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="minDurationSelect"
          bind:value={minDurationMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedMinDuration ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each minDurationPresetValues as val}
            <option value={val}>{t(`presets.minDuration.${val}`)}</option>
          {/each}
        </select>

        {#if minDurationMode === 'custom'}
          <div class="mt-2">
            <input
              type="number"
              min="0"
              bind:value={customMinDuration}
              placeholder={t('feedForm.customMinDurationPlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.minDurationHelp')}</p>
        <input type="hidden" name="minDuration" value={finalMinDuration} />
      </div>

      <!-- 최대 재생 시간 -->
      <div>
        <label for="maxDurationSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.maxDurationLabel')}
          {#if isModifiedMaxDuration}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="maxDurationSelect"
          bind:value={maxDurationMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedMaxDuration ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each maxDurationPresetValues as val}
            <option value={val}>{t(`presets.maxDuration.${val}`)}</option>
          {/each}
        </select>

        {#if maxDurationMode === 'custom'}
          <div class="mt-2">
            <input
              type="number"
              min="0"
              bind:value={customMaxDuration}
              placeholder={t('feedForm.customMaxDurationPlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.maxDurationHelp')}</p>
        <input type="hidden" name="maxDuration" value={finalMaxDuration} />
      </div>
    </div>

    <!-- 고급 필터 옵션 (접이식) -->
    <details class="pt-2 group border-t border-slate-800/80">
      <summary class="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer select-none font-medium">
        {t('feedForm.advancedFiltersToggle')}
      </summary>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="filterTitle" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.filterTitleLabel')}</label>
          <input
            id="filterTitle"
            name="filterTitle"
            type="text"
            bind:value={filterTitle}
            placeholder={t('feedForm.filterTitlePlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.filterTitleHelp')}</p>
        </div>

        <div>
          <label for="filterNotTitle" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.filterNotTitleLabel')}</label>
          <input
            id="filterNotTitle"
            name="filterNotTitle"
            type="text"
            bind:value={filterNotTitle}
            placeholder={t('feedForm.filterNotTitlePlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.filterNotTitleHelp')}</p>
        </div>

        <div>
          <label for="filterDescription" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.filterDescLabel')}</label>
          <input
            id="filterDescription"
            name="filterDescription"
            type="text"
            bind:value={filterDescription}
            placeholder={t('feedForm.filterDescPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="filterNotDescription" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.filterNotDescLabel')}</label>
          <input
            id="filterNotDescription"
            name="filterNotDescription"
            type="text"
            bind:value={filterNotDescription}
            placeholder={t('feedForm.filterNotDescPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </details>
  </div>

  <!-- 커스텀 팟캐스트 메타데이터 (custom) -->
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
    <details class="group">
      <summary class="flex items-center justify-between cursor-pointer select-none">
        <div>
          <h3 class="text-sm font-semibold text-white">{t('feedForm.customMetadataToggle')}</h3>
          <p class="text-xs text-slate-400 mt-0.5">{t('feedForm.customMetadataDesc')}</p>
        </div>
        <span class="text-xs text-indigo-400 group-open:rotate-180 transition-transform">▼</span>
      </summary>

      <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
        <div class="md:col-span-2">
          <label for="customCoverArt" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customCoverLabel')}</label>
          <input
            id="customCoverArt"
            name="customCoverArt"
            type="url"
            bind:value={customCoverArt}
            placeholder={t('feedForm.customCoverPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="customTitle" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customTitleLabel')}</label>
          <input
            id="customTitle"
            name="customTitle"
            type="text"
            bind:value={customTitle}
            placeholder={t('feedForm.customTitlePlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="customAuthor" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customAuthorLabel')}</label>
          <input
            id="customAuthor"
            name="customAuthor"
            type="text"
            bind:value={customAuthor}
            placeholder={t('feedForm.customAuthorPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div class="md:col-span-2">
          <label for="customDescription" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customDescLabel')}</label>
          <textarea
            id="customDescription"
            name="customDescription"
            rows="2"
            bind:value={customDescription}
            placeholder={t('feedForm.customDescPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div>
          <label for="customCategory" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customCategoryLabel')}</label>
          <input
            id="customCategory"
            name="customCategory"
            type="text"
            bind:value={customCategory}
            placeholder={t('feedForm.customCategoryPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="customSubcategories" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customSubcategoryLabel')}</label>
          <input
            id="customSubcategories"
            name="customSubcategories"
            type="text"
            bind:value={customSubcategories}
            placeholder={t('feedForm.customSubcategoryPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="customLangTag" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customLangLabel')}</label>
          <input
            id="customLangTag"
            name="customLangTag"
            type="text"
            bind:value={customLangTag}
            placeholder={t('feedForm.customLangPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label for="customOwnerEmail" class="block text-xs font-medium text-slate-300 mb-1">{t('feedForm.customOwnerEmailLabel')}</label>
          <input
            id="customOwnerEmail"
            name="customOwnerEmail"
            type="email"
            bind:value={customOwnerEmail}
            placeholder={t('feedForm.customOwnerEmailPlaceholder')}
            class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div class="md:col-span-2 pt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="customExplicit"
              bind:checked={customExplicit}
              class="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-xs text-slate-300">{t('feedForm.customExplicitLabel')}</span>
          </label>
        </div>
      </div>
    </details>
  </div>

  <!-- 4. YouTube & yt-dlp 친절 옵션 (YouTube 플랫폼 선택 시에만 노출) -->
  {#if selectedPlatform === 'youtube'}
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-white">{t('feedForm.ytDlSection')}</h3>
          <p class="text-xs text-slate-400 mt-0.5">{t('feedForm.ytDlSectionDesc')}</p>
        </div>
        <span class="inline-flex items-center gap-1 text-xs text-indigo-400 font-medium">
          <Sparkles class="w-3.5 h-3.5" />
          {t('feedForm.autoCombinedBadge')}
        </span>
      </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- 언어 우선순위 -->
      <div>
        <label for="langPrefSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.langPrefLabel')}
          {#if isModifiedLangPref}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="langPrefSelect"
          bind:value={langPref}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedLangPref ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          <option value="ko">{t('feedForm.langPrefKo')}</option>
          <option value="en">{t('feedForm.langPrefEn')}</option>
          <option value="ja">{t('feedForm.langPrefJa')}</option>
          <option value="none">{t('feedForm.langPrefNone')}</option>
          <option value="custom">{t('feedForm.langPrefCustom')}</option>
        </select>
        {#if langPref === 'custom'}
          <div class="mt-2">
            <input
              type="text"
              bind:value={customLang}
              placeholder="e.g. zh, fr, es"
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs font-mono focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.langPrefHelp')}</p>
      </div>

      <!-- 플레이어 클라이언트 -->
      <div>
        <label for="clientSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.clientSelectLabel')}
          {#if isModifiedPlayerClient}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="clientSelect"
          bind:value={playerClient}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedPlayerClient ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          <option value="android">{t('feedForm.clientAndroid')}</option>
          <option value="ios">{t('feedForm.clientIos')}</option>
          <option value="web">{t('feedForm.clientWeb')}</option>
          <option value="none">{t('feedForm.clientNone')}</option>
          <option value="custom">{t('feedForm.clientCustom')}</option>
        </select>
        {#if playerClient === 'custom'}
          <div class="mt-2">
            <input
              type="text"
              bind:value={customClient}
              placeholder="e.g. tv, mweb"
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs font-mono focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">{t('feedForm.clientHelp')}</p>
      </div>

      <!-- 포맷 스트림 최적화 (-f 18) -->
      <div class="md:col-span-2">
        <label for="formatStreamSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('feedForm.formatStreamLabel')}
          {#if isModifiedFormatStream}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="formatStreamSelect"
          bind:value={formatStream}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isModifiedFormatStream ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          <option value="18">{t('feedForm.formatStream18')}</option>
          <option value="bestaudio">{t('feedForm.formatStreamBestAudio')}</option>
          <option value="default">{t('feedForm.formatStreamDefault')}</option>
          <option value="custom">{t('feedForm.formatStreamCustom')}</option>
        </select>
        {#if formatStream === 'custom'}
          <div class="mt-2">
            <input
              type="text"
              bind:value={customFormatStream}
              placeholder="e.g. 22, bestvideo+bestaudio"
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs font-mono focus:outline-none"
            />
          </div>
        {/if}
        <p class="text-[11px] text-slate-500 mt-1">
          {t('feedForm.formatStreamHelp')}
        </p>
      </div>
    </div>

    <!-- 쇼츠(Shorts) 수집 정책 -->
    <div class="p-4 bg-slate-950/60 rounded-xl border {isModifiedShortsFilter ? 'border-amber-500/50' : 'border-slate-800/80'} space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium text-slate-200 flex items-center gap-1.5">
            <span>{t('feedForm.shortsFilterLabel')}</span>
            {#if isModifiedShortsFilter}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                {t('common.modified')}
              </span>
            {/if}
          </p>
          <p class="text-[11px] text-slate-500 mt-0.5">{t('feedForm.shortsFilterHelp')}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <label class="flex items-center gap-2 p-2.5 rounded-lg border {shortsFilter === 'all' ? 'border-indigo-500/60 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-300'} cursor-pointer hover:border-slate-700 transition-colors text-xs">
          <input
            type="radio"
            name="shortsOption"
            value="all"
            bind:group={shortsFilter}
            class="text-indigo-600 focus:ring-indigo-500"
          />
          <span class="font-medium">{t('feedForm.shortsFilterAll')}</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-lg border {shortsFilter === 'exclude' ? 'border-indigo-500/60 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-300'} cursor-pointer hover:border-slate-700 transition-colors text-xs">
          <input
            type="radio"
            name="shortsOption"
            value="exclude"
            bind:group={shortsFilter}
            class="text-indigo-600 focus:ring-indigo-500"
          />
          <span class="font-medium">{t('feedForm.shortsFilterExclude')}</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-lg border {shortsFilter === 'only' ? 'border-indigo-500/60 bg-indigo-600/10 text-white' : 'border-slate-800 bg-slate-900/60 text-slate-300'} cursor-pointer hover:border-slate-700 transition-colors text-xs">
          <input
            type="radio"
            name="shortsOption"
            value="only"
            bind:group={shortsFilter}
            class="text-indigo-600 focus:ring-indigo-500"
          />
          <span class="font-medium">{t('feedForm.shortsFilterOnly')}</span>
        </label>
      </div>
    </div>

    <!-- 라이브 스트림 제외 스위치 -->
    <div class="p-4 bg-slate-950/60 rounded-xl border {isModifiedExcludeLive ? 'border-amber-500/50' : 'border-slate-800/80'} flex items-center justify-between">
      <div>
        <p class="text-xs font-medium text-slate-200 flex items-center gap-1.5">
          <span>{t('feedForm.excludeLiveLabel')}</span>
          {#if isModifiedExcludeLive}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
              {t('common.modified')}
            </span>
          {/if}
        </p>
        <p class="text-[11px] text-slate-500 mt-0.5">{t('feedForm.excludeLiveHelp')}</p>
      </div>
      <input
        type="checkbox"
        bind:checked={excludeLive}
        class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>

    <!-- 추가적인 yt-dlp 인자 (아코디언/접기 가능 형태) -->
    <details class="pt-2 group">
      <summary class="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer select-none font-medium">
        {t('feedForm.extraArgsToggle')}
      </summary>
      <div class="mt-3 space-y-2">
        <textarea
          bind:value={extraArgs}
          rows="3"
          placeholder={t('feedForm.extraArgsPlaceholder')}
          class="block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        ></textarea>
        <p class="text-[11px] text-slate-500">{t('feedForm.extraArgsHelp')}</p>
      </div>
    </details>

    <!-- 최종 생성된 youtube_dl_args hidden 전송 -->
    <input type="hidden" name="youtubeDlArgs" value={combinedYtArgs()} />
  </div>
  {/if}

  <!-- 최종 전달 인자 미리보기 (친절 안내) -->
  <div class="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4">
    <div class="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-300">
      <HelpCircle class="w-4 h-4 text-indigo-400" />
      <span>{t('feedForm.summaryTitle')}</span>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
      <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-500 block">{t('feedForm.summaryPeriod')}</span>
        <span>{finalPeriod || t('feedForm.summaryUnspecified')}</span>
      </div>
      <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-500 block">{t('feedForm.summaryPageSize')}</span>
        <span>{finalPageSize || 10}</span>
      </div>
      <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-500 block">{t('feedForm.summaryKeepLast')}</span>
        <span>{finalKeepLast ? `${finalKeepLast}` : t('feedForm.summaryUnlimited')}</span>
      </div>
      <div class="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-500 block">{t('feedForm.summaryMinDuration')}</span>
        <span>{finalMinDuration ? `${finalMinDuration}s` : t('feedForm.summaryAll')}</span>
      </div>
    </div>
  </div>

  <!-- 작성 중인 피드 TOML 스니펫 미리보기 (기본 접힘) -->
  <details class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 group">
    <summary class="flex items-center justify-between cursor-pointer select-none">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-slate-400" />
        <h4 class="text-xs font-semibold text-white">{t('feedForm.snippetTitle')}</h4>
        <span class="text-[11px] text-slate-500 font-mono">{t('feedForm.snippetLive')}</span>
      </div>
      <button
        type="button"
        onclick={(e) => copyLiveFeedToml(e)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        {#if copiedFeedToml}
          <Check class="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('feedForm.snippetCopied')}</span>
        {:else}
          <Copy class="w-3.5 h-3.5" />
          <span>{t('feedForm.snippetCopy')}</span>
        {/if}
      </button>
    </summary>
    <div class="mt-3">
      <pre class="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono overflow-x-auto max-h-64 leading-relaxed">{liveFeedToml()}</pre>
    </div>
  </details>
</div>
