<script lang="ts">
  import { ArrowLeft, Save, RotateCcw } from '@lucide/svelte';
  import FeedForm from '$lib/components/FeedForm.svelte';
  import { t } from '$lib/i18n';
  import { parseFeedFormData } from '$lib/utils/feedPayload';
  import { goto } from '$app/navigation';

  let { data } = $props();
  let saving = $state(false);
  let errorMessage = $state<string | null>(null);
  let feedFormRef = $state<ReturnType<typeof FeedForm> | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    errorMessage = null;

    const formEl = e.currentTarget as HTMLFormElement;
    const formData = new FormData(formEl);
    const { feedId, feed } = parseFeedFormData(formData);

    if (!feedId) {
      errorMessage = '피드 ID를 입력해주세요.';
      saving = false;
      return;
    }
    if (!feed.url) {
      errorMessage = '소스 URL을 입력해주세요.';
      saving = false;
      return;
    }

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedId, feed })
      });

      const resData = await res.json();
      if (!res.ok) {
        errorMessage = resData.error || '피드 생성에 실패했습니다.';
        saving = false;
        return;
      }

      await goto('/');
    } catch {
      errorMessage = '서버와 통신할 수 없습니다.';
      saving = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
  <!-- 상단 뒤로가기 & 타이틀 & 액션 버튼 -->
  <div class="flex items-center justify-between pb-2 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <a
        href="/"
        class="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        title={t('common.back')}
      >
        <ArrowLeft class="w-5 h-5" />
      </a>
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">
          {data.cloneFrom ? t('feedForm.cloneTitle', { id: data.cloneFrom }) : t('feedForm.titleNew')}
        </h1>
        <p class="text-sm text-slate-400">
          {data.cloneFrom
            ? t('feedForm.cloneSubtitle', { id: data.cloneFrom })
            : t('feedForm.newSubtitle')}
        </p>
      </div>
    </div>

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

  {#if errorMessage}
    <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-4 rounded-xl">
      {errorMessage}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="space-y-6">
    <FeedForm bind:this={feedFormRef} feed={data.cloneSourceFeed} isEdit={false} error={errorMessage} {saving} />

    <!-- 제출 버튼 -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <a
        href="/"
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
        <span>{saving ? t('feedForm.saving') : t('feedForm.submitNew')}</span>
      </button>
    </div>
  </form>
</div>
