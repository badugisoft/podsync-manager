<script lang="ts">
  import { untrack } from 'svelte';
  import { stringify } from 'smol-toml';
  import {
    Sliders,
    Save,
    Copy,
    Check,
    FileText,
    Globe,
    Key,
    Trash,
    Cloud,
    HelpCircle,
    RotateCcw,
    Undo2,
    Database,
    Download,
    Terminal,
    HardDrive
  } from '@lucide/svelte';
  import { t } from '$lib/i18n/index.svelte';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let { data, form } = $props();
  let saving = $state(false);
  let rollingBack = $state(false);
  let copiedToml = $state(false);

  // 1. 실시간 반응형 폼 필드 (풀스펙)
  let serverHostname = $state('');
  let serverPort = $state(8080);
  let serverPath = $state('');
  let serverDataDir = $state('');

  let databaseDir = $state('');

  let youtubeToken = $state('');
  let vimeoToken = $state('');
  let soundcloudToken = $state('');
  let twitchToken = $state('');

  let storageType = $state<'s3' | 'local'>('s3');
  let s3Bucket = $state('podsync-data');
  let s3Region = $state('auto');
  let s3Endpoint = $state('');
  let s3Prefix = $state('');
  let forcePathStyle = $state(false);

  let downloaderSelfUpdate = $state(false);
  let downloaderTimeout = $state('');

  let logFilename = $state('');
  let logMaxSize = $state('');
  let logMaxAge = $state('');
  let logMaxBackups = $state('');
  let logCompress = $state(false);

  // 글로벌 보관 개수 프리셋 (다국어 반응형)
  let cleanupPresets = $derived([
    { label: t('settings.cleanupPresetAll'), value: '' },
    { label: t('settings.cleanupPreset5'), value: '5' },
    { label: t('settings.cleanupPreset10'), value: '10' },
    { label: t('settings.cleanupPreset20'), value: '20' },
    { label: t('settings.cleanupPreset50'), value: '50' },
    { label: t('settings.cleanupPresetCustom'), value: 'custom' }
  ]);

  let cleanupMode = $state('5');
  let customCleanup = $state('5');

  function resetToOriginal() {
    serverHostname = data.config.server?.hostname || '';
    serverPort = data.config.server?.port ?? 8080;
    serverPath = data.config.server?.path || '';
    serverDataDir = data.config.server?.data_dir || '';

    databaseDir = data.config.database?.dir || '';

    youtubeToken = data.config.tokens?.youtube || '';
    vimeoToken = data.config.tokens?.vimeo || '';
    soundcloudToken = data.config.tokens?.soundcloud || '';
    twitchToken = data.config.tokens?.twitch || '';

    storageType = data.config.storage?.type === 'local' ? 'local' : 's3';
    s3Bucket = data.config.storage?.s3?.bucket || 'podsync-data';
    s3Region = data.config.storage?.s3?.region || 'auto';
    s3Endpoint = data.config.storage?.s3?.endpoint_url || '';
    s3Prefix = data.config.storage?.s3?.prefix || '';
    forcePathStyle = data.config.storage?.s3?.force_path_style === true;

    downloaderSelfUpdate = data.config.downloader?.self_update === true;
    downloaderTimeout = data.config.downloader?.timeout !== undefined ? String(data.config.downloader.timeout) : '';

    logFilename = data.config.log?.filename || '';
    logMaxSize = data.config.log?.max_size !== undefined ? String(data.config.log.max_size) : '';
    logMaxAge = data.config.log?.max_age !== undefined ? String(data.config.log.max_age) : '';
    logMaxBackups = data.config.log?.max_backups !== undefined ? String(data.config.log.max_backups) : '';
    logCompress = data.config.log?.compress === true;

    const kl = data.config.cleanup?.keep_last !== undefined ? String(data.config.cleanup.keep_last) : '5';
    cleanupMode = ['5', '10', '20', '50', ''].includes(kl) ? kl : 'custom';
    customCleanup = kl;
  }

  // config 객체가 실제로 변경된 경우에만 재초기화 (폼 입력 상태 변경 시 재실행 방지)
  let lastConfig: typeof data.config | undefined = undefined;
  $effect.pre(() => {
    if (data.config !== lastConfig) {
      lastConfig = data.config;
      untrack(() => {
        resetToOriginal();
      });
    }
  });

  let finalCleanup = $derived(cleanupMode === 'custom' ? customCleanup : cleanupMode);

  // 항목별 변경 감지 상태들
  let isHostnameModified = $derived(serverHostname !== (data.config.server?.hostname || ''));
  let isPortModified = $derived(serverPort !== (data.config.server?.port ?? 8080));
  let isPathModified = $derived(serverPath !== (data.config.server?.path || ''));
  let isDataDirModified = $derived(serverDataDir !== (data.config.server?.data_dir || ''));
  let isDbDirModified = $derived(databaseDir !== (data.config.database?.dir || ''));
  let isYoutubeTokenModified = $derived(youtubeToken !== (data.config.tokens?.youtube || ''));
  let isVimeoTokenModified = $derived(vimeoToken !== (data.config.tokens?.vimeo || ''));
  let isSoundcloudTokenModified = $derived(soundcloudToken !== (data.config.tokens?.soundcloud || ''));
  let isTwitchTokenModified = $derived(twitchToken !== (data.config.tokens?.twitch || ''));
  let isCleanupModified = $derived(finalCleanup !== (data.config.cleanup?.keep_last !== undefined ? String(data.config.cleanup.keep_last) : '5'));
  let isStorageTypeModified = $derived(storageType !== (data.config.storage?.type === 'local' ? 'local' : 's3'));
  let isS3BucketModified = $derived(s3Bucket !== (data.config.storage?.s3?.bucket || 'podsync-data'));
  let isS3RegionModified = $derived(s3Region !== (data.config.storage?.s3?.region || 'auto'));
  let isS3EndpointModified = $derived(s3Endpoint !== (data.config.storage?.s3?.endpoint_url || ''));
  let isS3PrefixModified = $derived(s3Prefix !== (data.config.storage?.s3?.prefix || ''));
  let isForcePathStyleModified = $derived(forcePathStyle !== (data.config.storage?.s3?.force_path_style === true));
  let isDownloaderSelfUpdateModified = $derived(downloaderSelfUpdate !== (data.config.downloader?.self_update === true));
  let isDownloaderTimeoutModified = $derived(downloaderTimeout !== (data.config.downloader?.timeout !== undefined ? String(data.config.downloader.timeout) : ''));

  let modifiedCount = $derived(
    [
      isHostnameModified,
      isPortModified,
      isPathModified,
      isDataDirModified,
      isDbDirModified,
      isYoutubeTokenModified,
      isVimeoTokenModified,
      isSoundcloudTokenModified,
      isTwitchTokenModified,
      isCleanupModified,
      isStorageTypeModified,
      isS3BucketModified,
      isS3RegionModified,
      isS3EndpointModified,
      isS3PrefixModified,
      isForcePathStyleModified,
      isDownloaderSelfUpdateModified,
      isDownloaderTimeoutModified
    ].filter(Boolean).length
  );

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    try {
      const raw = liveToml();
      const res = await fetch('/api/config/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawToml: raw })
      });
      if (res.ok) {
        alert(t('settings.saveSuccess') || '설정이 저장되었습니다.');
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || '저장에 실패했습니다.');
      }
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      saving = false;
    }
  }

  async function handleRollback() {
    if (!confirm(t('settings.rollbackConfirm'))) return;
    rollingBack = true;
    try {
      const res = await fetch('/api/config/rollback', { method: 'POST' });
      const result = await res.json();
      if (result.ok) {
        alert(t('settings.rollbackSuccess'));
        window.location.reload();
      } else {
        alert(result.error || t('settings.rollbackFail'));
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert(err.message);
    } finally {
      rollingBack = false;
    }
  }

  // 실시간 live TOML 계산
  let liveToml = $derived(() => {
    try {
      const cloned = JSON.parse(JSON.stringify(data.config));
      cloned.server = {
        ...cloned.server,
        hostname: serverHostname,
        port: Number(serverPort) || 8080
      };
      if (serverPath.trim()) cloned.server.path = serverPath.trim(); else delete cloned.server.path;
      if (serverDataDir.trim()) cloned.server.data_dir = serverDataDir.trim(); else delete cloned.server.data_dir;

      // Database
      if (databaseDir.trim()) {
        cloned.database = { dir: databaseDir.trim() };
      } else {
        delete cloned.database;
      }

      // Tokens
      const tObj: Record<string, string> = {};
      if (youtubeToken.trim()) tObj.youtube = youtubeToken.trim();
      if (vimeoToken.trim()) tObj.vimeo = vimeoToken.trim();
      if (soundcloudToken.trim()) tObj.soundcloud = soundcloudToken.trim();
      if (twitchToken.trim()) tObj.twitch = twitchToken.trim();
      if (Object.keys(tObj).length > 0) {
        cloned.tokens = tObj;
      } else {
        delete cloned.tokens;
      }

      // Cleanup
      if (finalCleanup) {
        cloned.cleanup = { ...cloned.cleanup, keep_last: Number(finalCleanup) };
      } else {
        delete cloned.cleanup;
      }

      // Storage
      if (storageType === 'local') {
        cloned.storage = { type: 'local' };
      } else {
        const s3Obj: Record<string, unknown> = {};
        if (s3Bucket.trim()) s3Obj.bucket = s3Bucket.trim();
        if (s3Region.trim()) s3Obj.region = s3Region.trim();
        if (s3Endpoint.trim()) s3Obj.endpoint_url = s3Endpoint.trim();
        if (s3Prefix.trim()) s3Obj.prefix = s3Prefix.trim();
        if (forcePathStyle) s3Obj.force_path_style = true;

        cloned.storage = {
          type: 's3',
          ...(Object.keys(s3Obj).length > 0 ? { s3: s3Obj } : {})
        };
      }

      // Downloader
      const dlObj: Record<string, unknown> = {};
      if (downloaderSelfUpdate) dlObj.self_update = true;
      if (downloaderTimeout.trim()) dlObj.timeout = Number(downloaderTimeout.trim());
      if (Object.keys(dlObj).length > 0) {
        cloned.downloader = dlObj;
      } else {
        delete cloned.downloader;
      }

      // Log
      const lObj: Record<string, unknown> = {};
      if (logFilename.trim()) lObj.filename = logFilename.trim();
      if (logMaxSize.trim()) lObj.max_size = Number(logMaxSize.trim());
      if (logMaxAge.trim()) lObj.max_age = Number(logMaxAge.trim());
      if (logMaxBackups.trim()) lObj.max_backups = Number(logMaxBackups.trim());
      if (logCompress) lObj.compress = true;
      if (Object.keys(lObj).length > 0) {
        cloned.log = lObj;
      } else {
        delete cloned.log;
      }

      return stringify(cloned);
    } catch {
      return data.rawToml;
    }
  });

  async function copyRawToml(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ok = await copyToClipboard(liveToml());
    if (ok) {
      copiedToml = true;
      setTimeout(() => {
        copiedToml = false;
      }, 2000);
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
  <!-- 상단 헤더 & 컨트롤 -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Sliders class="w-6 h-6 text-indigo-400" />
        <h1 class="text-2xl font-bold text-white tracking-tight">{t('settings.pageTitle')}</h1>
      </div>
      <p class="text-sm text-slate-400 mt-1">
        {t('settings.pageSubtitle')}
      </p>
    </div>

    <!-- 리셋 및 백업 복원 액션들 -->
    <div class="flex items-center gap-2">
      {#if modifiedCount > 0}
        <span class="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl">
          {modifiedCount} {t('common.modified')}
        </span>
      {/if}

      <button
        type="button"
        onclick={resetToOriginal}
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        title={t('settings.inputReset')}
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>{t('settings.inputReset')}</span>
      </button>

      {#if data.hasBackup}
        <button
          type="button"
          onclick={handleRollback}
          disabled={rollingBack}
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors disabled:opacity-50"
          title={t('settings.rollback')}
        >
          <Undo2 class="w-3.5 h-3.5" />
          <span>{rollingBack ? t('common.loading') : t('settings.rollback')}</span>
        </button>
      {/if}
    </div>
  </div>

  {#if form?.success}
    <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm p-4 rounded-xl flex items-center justify-between">
      <span>{t('common.saved')}</span>
      <span class="text-xs bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
        {t('settings.applyPrompt', { action: t('nav.syncRestart') })}
      </span>
    </div>
  {/if}

  {#if form?.error}
    <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-4 rounded-xl">
      {form.error}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-6">
    <!-- 1. 서버 [server] -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.serverSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.serverDesc')}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
          [server]
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div class="md:col-span-2">
          <label for="serverHostname" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.serverHostname')} <span class="text-rose-400">*</span>
            {#if isHostnameModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="serverHostname"
            name="serverHostname"
            type="text"
            required
            bind:value={serverHostname}
            placeholder={t('settings.serverHostnamePlaceholder')}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isHostnameModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <p class="text-[11px] text-slate-500 mt-1">
            {t('settings.serverHostnameHelp')}
          </p>
        </div>

        <div>
          <label for="serverPort" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.serverPort')}
            {#if isPortModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="serverPort"
            name="serverPort"
            type="number"
            bind:value={serverPort}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isPortModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <p class="text-[11px] text-slate-500 mt-1">{t('settings.serverPortHelp')}</p>
        </div>

        <div>
          <label for="serverPath" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.serverPath')}
            {#if isPathModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="serverPath"
            name="serverPath"
            type="text"
            bind:value={serverPath}
            placeholder={t('settings.serverPathPlaceholder')}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isPathModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
        </div>

        <div class="md:col-span-2">
          <label for="serverDataDir" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.serverDataDir')}
            {#if isDataDirModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="serverDataDir"
            name="serverDataDir"
            type="text"
            bind:value={serverDataDir}
            placeholder={t('settings.serverDataDirPlaceholder')}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isDataDirModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
        </div>
      </div>
    </div>

    <!-- 2. 데이터베이스 [database] -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Database class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.databaseSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.databaseDesc')}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
          [database]
        </span>
      </div>

      <div>
        <label for="databaseDir" class="block text-xs font-medium text-slate-300 mb-1">
          {t('settings.databaseDir')}
          {#if isDbDirModified}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <input
          id="databaseDir"
          name="databaseDir"
          type="text"
          bind:value={databaseDir}
          placeholder={t('settings.databaseDirPlaceholder')}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isDbDirModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
        />
      </div>
    </div>

    <!-- 3. API 토큰 [tokens] -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Key class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.tokensSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.tokensDesc')}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
          [tokens]
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label for="youtubeToken" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.youtubeToken')}
            {#if isYoutubeTokenModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="youtubeToken"
            name="youtubeToken"
            type="text"
            bind:value={youtubeToken}
            placeholder={data.envTokens?.youtube ? `${t('settings.envInjectedBadge')}: ${data.envTokens.youtube.slice(0, 4)}...` : 'AIzaSy...'}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isYoutubeTokenModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
            <HelpCircle class="w-3.5 h-3.5 shrink-0" />
            <span>{t('settings.youtubeTokenHelp')}</span>
          </div>
        </div>

        <div>
          <label for="vimeoToken" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.vimeoToken')}
            {#if isVimeoTokenModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="vimeoToken"
            name="vimeoToken"
            type="text"
            bind:value={vimeoToken}
            placeholder={data.envTokens?.vimeo ? `${t('settings.envInjectedBadge')}: ${data.envTokens.vimeo.slice(0, 4)}...` : 'Vimeo token...'}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isVimeoTokenModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
            <HelpCircle class="w-3.5 h-3.5 shrink-0" />
            <span>{t('settings.vimeoTokenHelp')}</span>
          </div>
        </div>

        <div>
          <label for="soundcloudToken" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.soundcloudToken')}
            {#if isSoundcloudTokenModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="soundcloudToken"
            name="soundcloudToken"
            type="text"
            bind:value={soundcloudToken}
            placeholder={data.envTokens?.soundcloud ? `${t('settings.envInjectedBadge')}: ${data.envTokens.soundcloud.slice(0, 4)}...` : 'SoundCloud Client ID...'}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isSoundcloudTokenModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
            <HelpCircle class="w-3.5 h-3.5 shrink-0" />
            <span>{t('settings.soundcloudTokenHelp')}</span>
          </div>
        </div>

        <div>
          <label for="twitchToken" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.twitchToken')}
            {#if isTwitchTokenModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="twitchToken"
            name="twitchToken"
            type="text"
            bind:value={twitchToken}
            placeholder={data.envTokens?.twitch ? `${t('settings.envInjectedBadge')}: ${data.envTokens.twitch.slice(0, 4)}...` : 'Twitch Client ID...'}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isTwitchTokenModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <div class="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
            <HelpCircle class="w-3.5 h-3.5 shrink-0" />
            <span>{t('settings.twitchTokenHelp')}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 보관 정책 [cleanup] -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Trash class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.cleanupSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.cleanupDesc')}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
          [cleanup]
        </span>
      </div>

      <div>
        <label for="cleanupSelect" class="block text-xs font-medium text-slate-300 mb-1">
          {t('settings.cleanupKeepLast')}
          {#if isCleanupModified}
            <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
              {t('common.modified')}
            </span>
          {/if}
        </label>
        <select
          id="cleanupSelect"
          bind:value={cleanupMode}
          class="block w-full px-3.5 py-2.5 bg-slate-950 border {isCleanupModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm"
        >
          {#each cleanupPresets as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>

        {#if cleanupMode === 'custom'}
          <div class="mt-2">
            <input
              type="number"
              min="1"
              bind:value={customCleanup}
              placeholder={t('settings.cleanupCustomPlaceholder')}
              class="block w-full px-3 py-2 bg-slate-950 border border-indigo-500 rounded-lg text-slate-100 text-xs focus:outline-none"
            />
          </div>
        {/if}
        <input type="hidden" name="cleanupKeepLast" value={finalCleanup} />
      </div>
    </div>

    <!-- 5. 스토리지 [storage] (S3 호환 vs 로컬) -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Cloud class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.storageSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.storageDesc')}</p>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
          [storage]
        </span>
      </div>

      <!-- 스토리지 유형 선택 (S3 호환 vs 로컬 디스크) -->
      <div>
        <span class="block text-xs font-medium text-slate-300 mb-2">{t('settings.storageType')}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="relative flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors {storageType === 's3' ? 'bg-indigo-950/30 border-indigo-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}">
            <input
              type="radio"
              name="storageType"
              value="s3"
              bind:group={storageType}
              class="text-indigo-600 focus:ring-indigo-500 bg-slate-900"
            />
            <div class="flex items-center gap-2.5">
              <Cloud class="w-4 h-4 {storageType === 's3' ? 'text-indigo-400' : 'text-slate-500'}" />
              <div>
                <span class="text-xs font-semibold block">{t('settings.storageTypeS3')}</span>
                <span class="text-[11px] text-slate-400 block">{t('settings.storageTypeS3Desc')}</span>
              </div>
            </div>
          </label>

          <label class="relative flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors {storageType === 'local' ? 'bg-indigo-950/30 border-indigo-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}">
            <input
              type="radio"
              name="storageType"
              value="local"
              bind:group={storageType}
              class="text-indigo-600 focus:ring-indigo-500 bg-slate-900"
            />
            <div class="flex items-center gap-2.5">
              <HardDrive class="w-4 h-4 {storageType === 'local' ? 'text-indigo-400' : 'text-slate-500'}" />
              <div>
                <span class="text-xs font-semibold block">{t('settings.storageTypeLocal')}</span>
                <span class="text-[11px] text-slate-400 block">{t('settings.storageTypeLocalDesc')}</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {#if storageType === 'local'}
        <!-- 로컬 선택 시 안내 -->
        <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div class="flex items-center gap-2 font-semibold text-slate-200">
            <HardDrive class="w-4 h-4 text-emerald-400" />
            <span>{t('settings.storageLocalActive')}</span>
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            {t('settings.storageLocalDesc', { dir: serverDataDir || '/app/data' })}
          </p>
        </div>
      {:else}
        <!-- S3 선택 시 옵션 그리드 -->
        <div class="pt-2 border-t border-slate-800/80 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label for="s3Bucket" class="block text-xs font-medium text-slate-300 mb-1">
                {t('settings.s3Bucket')} <span class="text-rose-400">*</span>
                {#if isS3BucketModified}
                  <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                    {t('common.modified')}
                  </span>
                {/if}
              </label>
              <input
                id="s3Bucket"
                name="s3Bucket"
                type="text"
                bind:value={s3Bucket}
                placeholder={t('settings.s3BucketPlaceholder')}
                class="block w-full px-3.5 py-2.5 bg-slate-950 border {isS3BucketModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm font-mono"
              />
            </div>

            <div>
              <label for="s3Region" class="block text-xs font-medium text-slate-300 mb-1">
                {t('settings.s3Region')}
                {#if isS3RegionModified}
                  <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                    {t('common.modified')}
                  </span>
                {/if}
              </label>
              <input
                id="s3Region"
                name="s3Region"
                type="text"
                bind:value={s3Region}
                placeholder={t('settings.s3RegionPlaceholder')}
                class="block w-full px-3.5 py-2.5 bg-slate-950 border {isS3RegionModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm font-mono"
              />
            </div>

            <div class="md:col-span-2">
              <label for="s3Endpoint" class="block text-xs font-medium text-slate-300 mb-1">
                {t('settings.s3Endpoint')}
                {#if isS3EndpointModified}
                  <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                    {t('common.modified')}
                  </span>
                {/if}
              </label>
              <input
                id="s3Endpoint"
                name="s3Endpoint"
                type="text"
                bind:value={s3Endpoint}
                placeholder={t('settings.s3EndpointPlaceholder')}
                class="block w-full px-3.5 py-2.5 bg-slate-950 border {isS3EndpointModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 text-sm font-mono"
              />
            </div>

            <div>
              <label for="s3Prefix" class="block text-xs font-medium text-slate-300 mb-1">
                {t('settings.s3Prefix')}
                {#if isS3PrefixModified}
                  <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                    {t('common.modified')}
                  </span>
                {/if}
              </label>
              <input
                id="s3Prefix"
                name="s3Prefix"
                type="text"
                bind:value={s3Prefix}
                placeholder={t('settings.s3PrefixPlaceholder')}
                class="block w-full px-3.5 py-2.5 bg-slate-950 border {isS3PrefixModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm font-mono"
              />
            </div>

            <div class="flex items-center pt-6">
              <label class="relative flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="forcePathStyle"
                  bind:checked={forcePathStyle}
                  class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                />
                <span class="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <span>{t('settings.s3ForcePathStyle')}</span>
                  {#if isForcePathStyleModified}
                    <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                      {t('common.modified')}
                    </span>
                  {/if}
                </span>
              </label>
            </div>
          </div>

          <div class="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div class="flex items-center gap-1.5 font-medium text-slate-300">
              <HelpCircle class="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('settings.securityNotice')}</span>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              {t('settings.securityNoticeDesc')}
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- 6. 다운로더 [downloader] -->
    <details class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 group">
      <summary class="flex items-center justify-between cursor-pointer select-none">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Download class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.downloaderSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.downloaderDesc')}</p>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            [downloader]
          </span>
          <span class="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </div>
      </summary>

      <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-800/80">
        <div>
          <label for="downloaderTimeout" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.downloaderTimeout')}
            {#if isDownloaderTimeoutModified}
              <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md ml-1.5">
                {t('common.modified')}
              </span>
            {/if}
          </label>
          <input
            id="downloaderTimeout"
            name="downloaderTimeout"
            type="number"
            min="0"
            bind:value={downloaderTimeout}
            placeholder="0"
            class="block w-full px-3.5 py-2.5 bg-slate-950 border {isDownloaderTimeoutModified ? 'border-amber-500/50 focus:ring-amber-500' : 'border-slate-700 focus:ring-indigo-500'} rounded-xl text-slate-100 focus:outline-none focus:ring-2 text-sm font-mono"
          />
          <p class="text-[11px] text-slate-500 mt-1">{t('settings.downloaderTimeoutHelp')}</p>
        </div>

        <div class="flex items-center pt-4 sm:pt-6">
          <label class="relative flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="downloaderSelfUpdate"
              bind:checked={downloaderSelfUpdate}
              class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span class="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <span>{t('settings.downloaderSelfUpdate')}</span>
                {#if isDownloaderSelfUpdateModified}
                  <span class="inline-flex items-center text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                    {t('common.modified')}
                  </span>
                {/if}
              </span>
              <p class="text-[11px] text-slate-500">{t('settings.downloaderSelfUpdateHelp')}</p>
            </div>
          </label>
        </div>
      </div>
    </details>

    <!-- 7. 로그 파일 [log] -->
    <details class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 group">
      <summary class="flex items-center justify-between cursor-pointer select-none">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Terminal class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white">{t('settings.logSection')}</h3>
            <p class="text-xs text-slate-400">{t('settings.logDesc')}</p>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
            [log]
          </span>
          <span class="text-xs text-slate-500 group-open:rotate-180 transition-transform">▼</span>
        </div>
      </summary>

      <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-800/80">
        <div class="md:col-span-2">
          <label for="logFilename" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.logFilename')}
          </label>
          <input
            id="logFilename"
            name="logFilename"
            type="text"
            bind:value={logFilename}
            placeholder={t('settings.logFilenamePlaceholder')}
            class="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>

        <div>
          <label for="logMaxSize" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.logMaxSize')}
          </label>
          <input
            id="logMaxSize"
            name="logMaxSize"
            type="number"
            min="1"
            bind:value={logMaxSize}
            placeholder="10"
            class="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>

        <div>
          <label for="logMaxAge" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.logMaxAge')}
          </label>
          <input
            id="logMaxAge"
            name="logMaxAge"
            type="number"
            min="1"
            bind:value={logMaxAge}
            placeholder="30"
            class="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>

        <div>
          <label for="logMaxBackups" class="block text-xs font-medium text-slate-300 mb-1">
            {t('settings.logMaxBackups')}
          </label>
          <input
            id="logMaxBackups"
            name="logMaxBackups"
            type="number"
            min="1"
            bind:value={logMaxBackups}
            placeholder="3"
            class="block w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>

        <div class="flex items-center pt-4 sm:pt-6">
          <label class="relative flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="logCompress"
              bind:checked={logCompress}
              class="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <div>
              <span class="text-xs text-slate-300 font-medium">{t('settings.logCompress')}</span>
              <p class="text-[11px] text-slate-500">{t('settings.logCompressHelp')}</p>
            </div>
          </label>
        </div>
      </div>
    </details>

    <!-- 저장 버튼 -->
    <div class="flex items-center justify-end gap-3">
      <button
        type="submit"
        disabled={saving}
        class="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-50"
      >
        <Save class="w-4 h-4" />
        <span>{saving ? t('common.saving') : t('settings.saveGlobal')}</span>
      </button>
    </div>
  </form>

  <!-- 원시 config.toml 미리보기 (기본 접힘) -->
  <details class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 group">
    <summary class="flex items-center justify-between cursor-pointer select-none">
      <div class="flex items-center gap-2">
        <FileText class="w-4 h-4 text-slate-400" />
        <h3 class="text-sm font-semibold text-white">{t('settings.rawTomlPreview')}</h3>
        <span class="text-xs text-slate-500 font-normal">({t('settings.clickToExpand')})</span>
      </div>
      <button
        type="button"
        onclick={(e) => copyRawToml(e)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
      >
        {#if copiedToml}
          <Check class="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('common.copied')}</span>
        {:else}
          <Copy class="w-3.5 h-3.5" />
          <span>{t('settings.copyToml')}</span>
        {/if}
      </button>
    </summary>
    <div class="mt-4 space-y-2">
      <pre class="bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 font-mono overflow-x-auto max-h-80 leading-relaxed">{liveToml()}</pre>
      <p class="text-[11px] text-slate-500 font-mono">{t('settings.configPath', { path: data.configPath })}</p>
    </div>
  </details>
</div>
