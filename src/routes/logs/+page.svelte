<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal, Trash2, ArrowDown, Play, Square, Search, X, Check, Copy, SlidersHorizontal, Code } from '@lucide/svelte';
  import { parseLogLine, type ParsedLog, type LogLevel } from '$lib/utils/logParser';
  import { t } from '$lib/i18n/index.svelte';
  import { copyToClipboard } from '$lib/utils/clipboard';

  let rawLogs = $state<string[]>([]);
  let searchQuery = $state('');
  let autoScroll = $state(true);
  let isConnected = $state(false);
  let selectedLevel = $state<LogLevel | 'all'>('all');
  let viewMode = $state<'structured' | 'raw'>('structured');
  let copiedId = $state<string | null>(null);

  // 가져올 이전 로그 줄 수 (Tail)
  let tailLines = $state(100);
  const tailOptions = [100, 200, 300, 500, 1000];

  let logContainer = $state<HTMLDivElement | null>(null);
  let eventSource: EventSource | null = null;

  // 최근 검색어 (localStorage 연동)
  let recentSearches = $state<string[]>([]);

  function loadRecentSearches() {
    try {
      const saved = localStorage.getItem('podsync_recent_log_searches');
      if (saved) {
        recentSearches = JSON.parse(saved);
      }
    } catch {
      // 파싱 에러 무시
    }
  }

  function addRecentSearch(query: string) {
    const q = query.trim();
    if (!q) return;
    const updated = [q, ...recentSearches.filter((item) => item !== q)].slice(0, 8);
    recentSearches = updated;
    try {
      localStorage.setItem('podsync_recent_log_searches', JSON.stringify(updated));
    } catch {}
  }

  function removeRecentSearch(query: string, e?: Event) {
    if (e) e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== query);
    recentSearches = updated;
    try {
      localStorage.setItem('podsync_recent_log_searches', JSON.stringify(updated));
    } catch {}
  }

  function clearAllRecentSearches() {
    recentSearches = [];
    try {
      localStorage.removeItem('podsync_recent_log_searches');
    } catch {}
  }

  function applySearch(keyword: string) {
    searchQuery = keyword;
    addRecentSearch(keyword);
  }

  // 파싱된 로그 목록 (직전 줄의 시간을 연속 줄에 상속)
  let parsedLogs = $derived.by<ParsedLog[]>(() => {
    const list: ParsedLog[] = [];
    let lastTime = '';
    for (let idx = 0; idx < rawLogs.length; idx++) {
      const parsed = parseLogLine(rawLogs[idx], idx, lastTime);
      if (parsed.timestamp) {
        lastTime = parsed.displayTime;
      }
      list.push(parsed);
    }
    return list;
  });

  // 레벨별 카운트
  let levelCounts = $derived.by(() => {
    const counts = { all: parsedLogs.length, info: 0, warn: 0, error: 0, debug: 0, other: 0 };
    for (const log of parsedLogs) {
      if (log.level in counts) {
        counts[log.level]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  });

  // 검색 및 레벨 필터링
  let filteredLogs = $derived.by(() => {
    let list = parsedLogs;
    if (selectedLevel !== 'all') {
      list = list.filter((l) => l.level === selectedLevel);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.raw.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q) ||
          l.fields.some((f) => f.key.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
      );
    }
    return list;
  });

  function scrollToBottom() {
    if (autoScroll && logContainer && !searchQuery.trim()) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  function startStreaming() {
    if (eventSource) return;

    eventSource = new EventSource(`/api/container/logs?tail=${tailLines}`);
    isConnected = true;

    eventSource.onmessage = (event) => {
      try {
        const line = JSON.parse(event.data);
        rawLogs.push(line);
        if (rawLogs.length > 5000) {
          rawLogs.shift();
        }
        setTimeout(scrollToBottom, 20);
      } catch {
        rawLogs.push(event.data);
      }
    };

    eventSource.onerror = () => {
      isConnected = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }

  function handleTailChange(newTail: number) {
    if (tailLines === newTail) return;
    tailLines = newTail;
    rawLogs = [];
    stopStreaming();
    startStreaming();
  }

  function stopStreaming() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      isConnected = false;
    }
  }

  function clearLogs() {
    rawLogs = [];
  }

  async function copyLogLine(log: ParsedLog, e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ok = await copyToClipboard(log.raw);
    if (ok) {
      copiedId = log.id;
      setTimeout(() => {
        if (copiedId === log.id) copiedId = null;
      }, 1500);
    }
  }

  onMount(() => {
    loadRecentSearches();
    startStreaming();
  });

  onDestroy(() => {
    stopStreaming();
  });
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  <!-- 상단 헤더 & 컨트롤 -->
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Terminal class="w-6 h-6 text-indigo-400" />
        <h1 class="text-2xl font-bold text-white tracking-tight">{t('logs.title')}</h1>
        {#if isConnected}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {t('logs.streaming')}
          </span>
        {:else}
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            {t('logs.disconnected')}
          </span>
        {/if}
      </div>
      <p class="text-sm text-slate-400 mt-1">{t('logs.subtitle')}</p>
    </div>

    <!-- 검색 입력창 & 컨트롤 버튼들 -->
    <div class="flex flex-wrap items-center gap-2.5">
      <!-- 검색 필터 -->
      <div class="relative min-w-[260px] sm:w-72">
        <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={searchQuery}
          onkeydown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              addRecentSearch(searchQuery.trim());
            }
          }}
          placeholder={t('logs.searchPlaceholder')}
          class="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>

      <!-- 뷰 모드 토글 (구조화 / Raw) -->
      <div class="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
        <button
          onclick={() => (viewMode = 'structured')}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors {viewMode === 'structured' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          title="Structured view"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          <span>{t('logs.viewStructured')}</span>
        </button>
        <button
          onclick={() => (viewMode = 'raw')}
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors {viewMode === 'raw' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          title="Terminal raw view"
        >
          <Code class="w-3.5 h-3.5" />
          <span>{t('logs.viewRaw')}</span>
        </button>
      </div>

      <!-- 가져올 로그 라인 수 (Tail) 선택 드롭다운 -->
      <div class="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
        <span class="text-slate-500 text-[11px] font-medium select-none">{t('logs.tailLines')}:</span>
        <select
          value={tailLines}
          onchange={(e) => handleTailChange(Number(e.currentTarget.value))}
          class="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-mono font-semibold"
        >
          {#each tailOptions as opt}
            <option value={opt} class="bg-slate-900 text-slate-100">
              {t('logs.linesCount', { count: opt })}
            </option>
          {/each}
        </select>
      </div>

      <button
        onclick={() => (autoScroll = !autoScroll)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors {autoScroll ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-400'}"
      >
        <ArrowDown class="w-3.5 h-3.5" />
        <span>{t('logs.autoScroll')}: {autoScroll ? 'ON' : 'OFF'}</span>
      </button>

      {#if isConnected}
        <button
          onclick={stopStreaming}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          <Square class="w-3.5 h-3.5" />
          <span>{t('logs.pause')}</span>
        </button>
      {:else}
        <button
          onclick={startStreaming}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Play class="w-3.5 h-3.5" />
          <span>{t('logs.reconnect')}</span>
        </button>
      {/if}

      <button
        onclick={clearLogs}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        title="Clear screen logs"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>{t('logs.clear')}</span>
      </button>
    </div>
  </div>

  <!-- 레벨 필터 탭 바 -->
  <div class="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
    <button
      onclick={() => (selectedLevel = 'all')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium {selectedLevel === 'all' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200'}"
    >
      <span>{t('logs.filterAll')}</span>
      <span class="px-1.5 py-0.2 rounded-md bg-slate-700/60 text-[11px] font-mono">{levelCounts.all}</span>
    </button>

    <button
      onclick={() => (selectedLevel = 'info')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium {selectedLevel === 'info' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-emerald-300'}"
    >
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <span>INFO</span>
      <span class="px-1.5 py-0.2 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-mono">{levelCounts.info}</span>
    </button>

    <button
      onclick={() => (selectedLevel = 'warn')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium {selectedLevel === 'warn' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-amber-300'}"
    >
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <span>WARN</span>
      <span class="px-1.5 py-0.2 rounded-md bg-amber-950 text-amber-400 border border-amber-800 text-[11px] font-mono">{levelCounts.warn}</span>
    </button>

    <button
      onclick={() => (selectedLevel = 'error')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium {selectedLevel === 'error' ? 'bg-rose-950/40 border-rose-500 text-rose-300' : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-rose-300'}"
    >
      <span class="w-2 h-2 rounded-full bg-rose-400"></span>
      <span>ERROR</span>
      <span class="px-1.5 py-0.2 rounded-md bg-rose-950 text-rose-400 border border-rose-800 text-[11px] font-mono">{levelCounts.error}</span>
    </button>

    <button
      onclick={() => (selectedLevel = 'debug')}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors font-medium {selectedLevel === 'debug' ? 'bg-purple-950/40 border-purple-500 text-purple-300' : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-purple-300'}"
    >
      <span class="w-2 h-2 rounded-full bg-purple-400"></span>
      <span>DEBUG</span>
      <span class="px-1.5 py-0.2 rounded-md bg-purple-950 text-purple-400 border border-purple-800 text-[11px] font-mono">{levelCounts.debug}</span>
    </button>
  </div>

  <!-- 최근 검색어 바 -->
  {#if recentSearches.length > 0}
    <div class="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
      <span class="text-slate-500 mr-1 select-none">{t('logs.recentSearches')}</span>
      {#each recentSearches as keyword}
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-indigo-500 transition-colors">
          <button
            onclick={() => applySearch(keyword)}
            class="hover:text-indigo-300 font-mono"
          >
            {keyword}
          </button>
          <button
            onclick={(e) => removeRecentSearch(keyword, e)}
            class="text-slate-400 hover:text-rose-400 ml-0.5"
            title="Delete"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      {/each}
      <button
        onclick={clearAllRecentSearches}
        class="text-[11px] text-slate-500 hover:text-slate-300 ml-auto underline"
      >
        {t('logs.clearAll')}
      </button>
    </div>
  {/if}

  <!-- 검색 및 필터 결과 상태 바 -->
  {#if searchQuery.trim() || selectedLevel !== 'all'}
    <div class="px-4 py-2 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs flex items-center justify-between text-indigo-300">
      <span>
        {#if selectedLevel !== 'all'}
          <span class="uppercase font-semibold text-white">[{selectedLevel}]</span>
        {/if}
        {#if searchQuery.trim()}
          '<strong>{searchQuery}</strong>'
        {/if}
        <strong class="text-white ml-1">{filteredLogs.length}</strong> / {rawLogs.length}
      </span>
      <button
        onclick={() => { searchQuery = ''; selectedLevel = 'all'; }}
        class="text-indigo-400 hover:text-indigo-200 underline"
      >
        {t('common.reset')}
      </button>
    </div>
  {/if}

  <!-- 로그 콘솔 창 -->
  <div
    bind:this={logContainer}
    class="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 h-[650px] overflow-y-auto leading-relaxed shadow-inner"
  >
    {#if rawLogs.length === 0}
      <div class="h-full flex items-center justify-center text-slate-600">
        {t('logs.noLogsYet')}
      </div>
    {:else if filteredLogs.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
        <Search class="w-8 h-8 text-slate-600" />
        <p>{t('logs.noMatchingLogs')}</p>
      </div>
    {:else if viewMode === 'raw'}
      <!-- 원문 모드 -->
      <div class="space-y-0.5">
        {#each filteredLogs as log, index}
          <div class="flex gap-3 hover:bg-slate-900/40 px-1 py-0.5 rounded">
            <span class="text-slate-600 select-none text-[11px] w-8 text-right shrink-0">{index + 1}</span>
            <span class="break-all whitespace-pre-wrap {log.level === 'error' ? 'text-rose-400 font-semibold' : log.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}">{log.raw}</span>
          </div>
        {/each}
      </div>
    {:else}
      <!-- 구조화 모드 (날짜/시간 / 레벨 / 메시지 / 필드 분리) -->
      <div class="divide-y divide-slate-900">
        {#each filteredLogs as log}
          <div class="group flex items-start gap-2.5 py-1 px-1.5 rounded hover:bg-slate-900/50 transition-colors">
            <!-- 1. 날짜 및 시간 -->
            <span class="text-slate-500 select-none text-[11px] shrink-0 font-mono pt-0.5 w-32 sm:w-36 truncate" title={log.timestamp || log.displayTime}>
              {log.displayTime}
            </span>

            <!-- 2. 레벨 배지 -->
            <div class="shrink-0 pt-0.5">
              {#if log.level === 'error'}
                <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  ERR
                </span>
              {:else if log.level === 'warn'}
                <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  WARN
                </span>
              {:else if log.level === 'info'}
                <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  INFO
                </span>
              {:else if log.level === 'debug'}
                <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  DBG
                </span>
              {:else}
                <span class="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
                  LOG
                </span>
              {/if}
            </div>

            <!-- 3. 메시지 본문 및 인라인 메타 필드 -->
            <div class="min-w-0 flex-1 break-all whitespace-pre-wrap {log.level === 'error' ? 'text-rose-300 font-medium' : log.level === 'warn' ? 'text-amber-200' : 'text-slate-200'}">
              <span>{log.message}</span>
              {#if log.fields.length > 0}
                <span class="inline-flex flex-wrap gap-1 ml-1.5 align-baseline">
                  {#each log.fields as field}
                    <span class="inline-flex items-center px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10.5px] text-slate-400 font-mono">
                      <span class="text-indigo-400 font-medium">{field.key}=</span>
                      <span class="text-slate-300 truncate max-w-xs">{field.value}</span>
                    </span>
                  {/each}
                </span>
              {/if}
            </div>

            <!-- 원문 복사 버튼 -->
            <button
              type="button"
              onclick={() => copyLogLine(log)}
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800 shrink-0"
              title="원문 로그 라인 복사"
            >
              {#if copiedId === log.id}
                <Check class="w-3.5 h-3.5 text-emerald-400" />
              {:else}
                <Copy class="w-3.5 h-3.5" />
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
