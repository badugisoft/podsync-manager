<script lang="ts">
  import { X, CheckCircle2, AlertTriangle, ExternalLink, Clock, Calendar, Filter, Loader2, Sparkles } from '@lucide/svelte';
  import { t } from '$lib/i18n';

  export interface PreviewEpisodeItem {
    id: string;
    title: string;
    description: string;
    duration: number;
    durationStr: string;
    thumbnail?: string;
    uploadDate?: string;
    url?: string;
    passed: boolean;
    rejectReason?: string;
  }

  export interface PreviewResult {
    sourceTitle: string;
    totalCount: number;
    passedCount: number;
    episodes: PreviewEpisodeItem[];
  }

  let {
    open = false,
    loading = false,
    error = null,
    previewData = null,
    onclose
  }: {
    open: boolean;
    loading: boolean;
    error: string | null;
    previewData: PreviewResult | null;
    onclose: () => void;
  } = $props();

  type TabFilter = 'all' | 'passed' | 'excluded';
  let activeTab = $state<TabFilter>('all');

  let filteredEpisodes = $derived(() => {
    if (!previewData || !previewData.episodes) return [];
    if (activeTab === 'passed') {
      return previewData.episodes.filter((ep) => ep.passed);
    }
    if (activeTab === 'excluded') {
      return previewData.episodes.filter((ep) => !ep.passed);
    }
    return previewData.episodes;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Container -->
    <div
      class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Filter class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-white flex items-center gap-2">
              {t('previewModal.title')}
              {#if previewData}
                <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {t('previewModal.totalCount', { total: previewData.totalCount })}
                </span>
              {/if}
            </h3>
            <p class="text-xs text-slate-400">{t('previewModal.subtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          onclick={onclose}
          class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label={t('previewModal.close')}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        {#if loading}
          <!-- Loading State -->
          <div class="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div class="relative">
              <div class="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <Sparkles class="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-200">{t('feedForm.previewLoading')}</p>
              <p class="text-xs text-slate-500 mt-1 max-w-md">
                {t('previewModal.containerNotice')}
              </p>
            </div>
          </div>
        {:else if error}
          <!-- Error State -->
          <div class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="font-medium">에피소드 확인 오류</p>
              <p class="text-xs text-rose-300/80 leading-relaxed">{error}</p>
              <p class="text-[11px] text-slate-400 mt-2">
                * Podsync 컨테이너가 정상 실행 중인지 확인해 주세요.
              </p>
            </div>
          </div>
        {:else if previewData}
          <!-- Info & Summary Bar -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs text-slate-300 font-medium truncate max-w-md">
                <span class="text-slate-500 mr-1.5">소스:</span>
                <span class="text-white">{previewData.sourceTitle}</span>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                  {t('previewModal.passedCount', { count: previewData.passedCount })}
                </span>
                <span class="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold">
                  {t('previewModal.excludedCount', { count: previewData.totalCount - previewData.passedCount })}
                </span>
              </div>
            </div>

            <!-- Tabs -->
            <div class="flex items-center gap-1.5 border-t border-slate-800/80 pt-2.5">
              <button
                type="button"
                onclick={() => (activeTab = 'all')}
                class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors {activeTab === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'}"
              >
                {t('previewModal.tabAll')} ({previewData.totalCount})
              </button>
              <button
                type="button"
                onclick={() => (activeTab = 'passed')}
                class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors {activeTab === 'passed'
                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
                  : 'text-slate-400 hover:text-emerald-400'}"
              >
                {t('previewModal.tabPassed')} ({previewData.passedCount})
              </button>
              <button
                type="button"
                onclick={() => (activeTab = 'excluded')}
                class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors {activeTab === 'excluded'
                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
                  : 'text-slate-400 hover:text-rose-400'}"
              >
                {t('previewModal.tabExcluded')} ({previewData.totalCount - previewData.passedCount})
              </button>
            </div>
          </div>

          <!-- Episodes List -->
          {#if filteredEpisodes().length === 0}
            <div class="py-12 text-center text-xs text-slate-500">
              {t('previewModal.emptyList')}
            </div>
          {:else}
            <div class="space-y-2.5">
              {#each filteredEpisodes() as ep (ep.id)}
                <div
                  class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors {ep.passed
                    ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    : 'bg-rose-950/10 border-rose-900/30'}"
                >
                  <!-- Left: Thumbnail & Info -->
                  <div class="flex items-start gap-3 min-w-0 flex-1">
                    {#if ep.thumbnail}
                      <img
                        src={ep.thumbnail}
                        alt=""
                        class="w-16 h-11 object-cover rounded-lg bg-slate-800 shrink-0 border border-slate-800"
                        loading="lazy"
                      />
                    {:else}
                      <div class="w-16 h-11 rounded-lg bg-slate-800/80 shrink-0 border border-slate-800 flex items-center justify-center text-slate-600 text-xs">
                        No Img
                      </div>
                    {/if}

                    <div class="min-w-0 flex-1 space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-medium text-slate-200 line-clamp-1 hover:text-white" title={ep.title}>
                          {ep.title}
                        </span>
                        {#if ep.url}
                          <a
                            href={ep.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-slate-500 hover:text-indigo-400 shrink-0"
                            title={t('previewModal.openLink')}
                          >
                            <ExternalLink class="w-3.5 h-3.5" />
                          </a>
                        {/if}
                      </div>

                      <div class="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                        {#if ep.durationStr}
                          <span class="flex items-center gap-1">
                            <Clock class="w-3 h-3 text-slate-600" />
                            {ep.durationStr}
                          </span>
                        {/if}
                        {#if ep.uploadDate}
                          <span class="flex items-center gap-1">
                            <Calendar class="w-3 h-3 text-slate-600" />
                            {ep.uploadDate}
                          </span>
                        {/if}
                      </div>

                      {#if !ep.passed && ep.rejectReason}
                        <div class="text-[11px] text-rose-400/90 font-mono flex items-center gap-1 pt-0.5">
                          <span class="font-semibold">{t('previewModal.reasonLabel')}:</span>
                          <span>{ep.rejectReason}</span>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Right: Status Badge -->
                  <div class="shrink-0 self-end sm:self-center">
                    {#if ep.passed}
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">
                        <CheckCircle2 class="w-3.5 h-3.5" />
                        {t('previewModal.statusPassed')}
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono">
                        <AlertTriangle class="w-3.5 h-3.5" />
                        {t('previewModal.statusExcluded')}
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <span class="text-[11px] text-slate-500">
          {t('previewModal.containerNotice')}
        </span>
        <button
          type="button"
          onclick={onclose}
          class="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          {t('previewModal.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
