<script lang="ts">
  import { Lock, Radio } from '@lucide/svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { i18n, t, SUPPORTED_LOCALES } from '$lib/i18n/index.svelte';

  let { form }: { form: { error?: string } | null } = $props();
  let loading = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-950 px-4 sm:px-6 lg:px-8 relative">
  <!-- 상단 테마 & 언어 선택기 -->
  <div class="absolute top-6 right-6 flex items-center gap-2">
    <ThemeToggle />
    <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
      {#each SUPPORTED_LOCALES as loc}
        <button
          type="button"
          onclick={() => i18n.setLocale(loc.code)}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium {i18n.locale === loc.code ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}"
          title={loc.label}
        >
          <span class="text-base leading-none select-none">{loc.flag}</span>
          <span class="hidden md:inline">{loc.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="max-w-md w-full space-y-8 bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-4">
        <Radio class="w-8 h-8 text-indigo-400" />
      </div>
      <h2 class="text-2xl font-bold tracking-tight text-white">{t('login.title')}</h2>
      <p class="mt-2 text-sm text-slate-400">{t('login.subtitle')}</p>
    </div>

    {#if form?.error}
      <div class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3 rounded-lg text-center">
        {form.error}
      </div>
    {/if}

    <form class="mt-8 space-y-6" method="POST" onsubmit={() => (loading = true)}>
      <div class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-slate-300 mb-1">{t('login.username')}</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            class="block w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="admin"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-slate-300 mb-1">{t('login.password')}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            class="block w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          class="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-colors disabled:opacity-50"
        >
          <Lock class="w-4 h-4" />
          <span>{loading ? t('login.signingIn') : t('login.signIn')}</span>
        </button>
      </div>
    </form>
  </div>
</div>
