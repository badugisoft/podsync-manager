<script lang="ts">
  import { ArrowLeft, Save, RotateCcw } from '@lucide/svelte';
  import FeedForm from '$lib/components/FeedForm.svelte';
  import { t } from '$lib/i18n';

  let { data, form } = $props();
  let saving = $state(false);
  let feedFormRef = $state<ReturnType<typeof FeedForm> | null>(null);
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  <!-- 상단 뒤로가기 & 타이틀 & 액션 버튼 -->
  <div class="flex items-center justify-between pb-2 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <a
        href="/feeds/{data.feedId}"
        class="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        title={t('common.back')}
      >
        <ArrowLeft class="w-5 h-5" />
      </a>
      <div>
        <span class="text-xs font-mono text-indigo-400">{t('feedForm.editSubtitle')}</span>
        <h1 class="text-2xl font-bold text-white tracking-tight font-mono">{data.feedId}</h1>
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if feedFormRef && feedFormRef.getModifiedCount() > 0}
        <span class="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl">
          {feedFormRef.getModifiedCount()} {t('common.modified')}
        </span>
      {/if}

      <!-- 원본으로 되돌리기 버튼 -->
      <button
        type="button"
        onclick={() => feedFormRef?.reset()}
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-sm"
        title={t('feedForm.resetBtnTooltip')}
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>{t('feedForm.resetBtn')}</span>
      </button>
    </div>
  </div>

  <form method="POST" onsubmit={() => (saving = true)} class="space-y-6">
    <FeedForm bind:this={feedFormRef} feed={data.feed} isEdit={true} error={form?.error} {saving} />

    <!-- 제출 버튼 -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <a
        href="/feeds/{data.feedId}"
        class="px-4 py-2.5 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
      >
        {t('feedForm.cancel')}
      </a>
      <button
        type="submit"
        disabled={saving}
        class="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-50"
      >
        <Save class="w-4 h-4" />
        <span>{saving ? t('feedForm.updating') : t('feedForm.saveChanges')}</span>
      </button>
    </div>
  </form>
</div>
