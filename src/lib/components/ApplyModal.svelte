<script lang="ts">
  import { onMount } from 'svelte';
  import { X, RefreshCw, Edit3, GitCommit, AlertTriangle, Check, Save } from '@lucide/svelte';
  import { t } from '$lib/i18n/index.svelte';

  let {
    isOpen = false,
    onClose = () => {},
    onRestartComplete = () => {}
  }: {
    isOpen?: boolean;
    onClose?: () => void;
    onRestartComplete?: () => void;
  } = $props();

  let activeTab = $state<'diff' | 'edit'>('diff');
  let loading = $state(false);
  let applying = $state(false);
  let savingEdit = $state(false);
  let editSuccess = $state(false);
  let errorMessage = $state<string | null>(null);

  interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    text: string;
  }

  let diffLines = $state<DiffLine[]>([]);
  let currentToml = $state('');
  let editableToml = $state('');
  let hasChanges = $state(false);

  export async function loadDiff() {
    loading = true;
    errorMessage = null;
    try {
      const res = await fetch('/api/config/diff');
      const data = await res.json();
      diffLines = data.diffLines || [];
      currentToml = data.currentToml || '';
      editableToml = currentToml;
      hasChanges = data.hasChanges;
    } catch (e: unknown) {
      const err = e as Error;
      errorMessage = err.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      loadDiff();
    }
  });

  async function handleSaveEdit() {
    savingEdit = true;
    errorMessage = null;
    editSuccess = false;
    try {
      const res = await fetch('/api/config/raw', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawToml: editableToml })
      });
      const result = await res.json();
      if (result.ok) {
        editSuccess = true;
        await loadDiff();
        setTimeout(() => {
          editSuccess = false;
        }, 2000);
      } else {
        errorMessage = result.error || t('common.error');
      }
    } catch (e: unknown) {
      const err = e as Error;
      errorMessage = err.message;
    } finally {
      savingEdit = false;
    }
  }

  async function handleApplyAndRestart() {
    if (applying) return;
    applying = true;
    errorMessage = null;

    try {
      const res = await fetch('/api/container/restart', { method: 'POST' });
      const result = await res.json();
      if (result.ok) {
        onRestartComplete();
      } else {
        errorMessage = result.error || t('nav.restartFailed');
      }
    } catch (e: unknown) {
      const err = e as Error;
      errorMessage = err.message;
    } finally {
      applying = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
    <div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GitCommit class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-base font-bold text-white">{t('applyModal.title')}</h2>
            <p class="text-xs text-slate-400">{t('applyModal.subtitle')}</p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title={t('common.close')}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 탭 바 -->
      <div class="px-6 pt-3 border-b border-slate-800 flex items-center gap-3">
        <button
          onclick={() => (activeTab = 'diff')}
          class="pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors {activeTab === 'diff' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <GitCommit class="w-3.5 h-3.5" />
          <span>{t('applyModal.tabDiff')}</span>
          {#if hasChanges}
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          {/if}
        </button>

        <button
          onclick={() => (activeTab = 'edit')}
          class="pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors {activeTab === 'edit' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Edit3 class="w-3.5 h-3.5" />
          <span>{t('applyModal.tabEdit')}</span>
        </button>
      </div>

      <!-- 에러 배너 -->
      {#if errorMessage}
        <div class="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <!-- 모달 본문 영역 -->
      <div class="flex-1 p-6 overflow-y-auto">
        {#if loading}
          <div class="h-64 flex items-center justify-center text-xs text-slate-500">
            {t('applyModal.comparing')}
          </div>
        {:else if activeTab === 'diff'}
          <!-- Diff 뷰 -->
          <div class="bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto divide-y divide-slate-800/40">
            {#if !hasChanges}
              <div class="p-8 text-center text-slate-500">
                {t('applyModal.noChanges')}
              </div>
            {:else}
              {#each diffLines as line, index}
                <div class="flex items-start px-3 py-1 leading-relaxed {line.type === 'added' ? 'bg-emerald-950/40 text-emerald-300' : line.type === 'removed' ? 'bg-rose-950/40 text-rose-300 line-through opacity-75' : 'text-slate-400'}">
                  <span class="select-none text-slate-600 w-8 text-right pr-3 shrink-0 text-[11px]">{index + 1}</span>
                  <span class="select-none w-4 font-bold shrink-0">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                  <span class="whitespace-pre-wrap break-all">{line.text}</span>
                </div>
              {/each}
            {/if}
          </div>
        {:else}
          <!-- 직접 편집 뷰 -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">{t('applyModal.editNotice')}</span>
              <button
                type="button"
                onclick={handleSaveEdit}
                disabled={savingEdit}
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {#if editSuccess}
                  <Check class="w-3.5 h-3.5 text-emerald-300" />
                  <span>{t('applyModal.saveTempSuccess')}</span>
                {:else}
                  <Save class="w-3.5 h-3.5" />
                  <span>{savingEdit ? t('common.saving') : t('applyModal.saveTemp')}</span>
                {/if}
              </button>
            </div>
            <textarea
              bind:value={editableToml}
              rows="18"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            ></textarea>
          </div>
        {/if}
      </div>

      <!-- 모달 푸터 -->
      <div class="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {t('applyModal.cancelClose')}
        </button>

        <button
          type="button"
          onclick={handleApplyAndRestart}
          disabled={applying}
          class="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-colors disabled:opacity-50"
        >
          <RefreshCw class="w-4 h-4 {applying ? 'animate-spin' : ''}" />
          <span>{applying ? t('nav.applying') : t('applyModal.confirmRestart')}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
