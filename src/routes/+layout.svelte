<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { Radio, RefreshCw, Terminal, Sliders, LogOut, CheckCircle2, AlertCircle, ChevronDown } from '@lucide/svelte';
  import ApplyModal from '$lib/components/ApplyModal.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { i18n, t, SUPPORTED_LOCALES, type Locale } from '$lib/i18n/index.svelte';

  let { data, children } = $props();

  let isApplyModalOpen = $state(false);
  let isLangMenuOpen = $state(false);
  let restartMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleOpenApplyModal() {
    isApplyModalOpen = true;
  }

  function handleRestartComplete() {
    isApplyModalOpen = false;
    restartMessage = { type: 'success', text: t('nav.restartSuccess') };
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  function selectLanguage(loc: Locale) {
    i18n.setLocale(loc);
    isLangMenuOpen = false;
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    document.cookie = 'podsync_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/login';
  }

  // 현재 선택된 언어 라벨
  let currentLocaleOption = $derived(
    SUPPORTED_LOCALES.find((l) => l.code === i18n.locale) || SUPPORTED_LOCALES[0]
  );
</script>

<div class="min-h-screen bg-slate-950 flex flex-col text-slate-100">
  {#if data.user && !$page.url.pathname.startsWith('/login')}
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Logo & Brand -->
        <div class="flex items-center gap-6">
          <a href="/" class="flex items-center gap-2.5 font-bold text-lg text-white group">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Radio class="w-5 h-5 text-indigo-400" />
            </div>
            <span>Podsync Manager</span>
          </a>

          <!-- Nav Links -->
          <nav class="hidden md:flex items-center gap-1">
            <a
              href="/"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {$page.url.pathname === '/' || $page.url.pathname.startsWith('/feeds') ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
            >
              {t('nav.feeds')}
            </a>
            <a
              href="/logs"
              class="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors {$page.url.pathname.startsWith('/logs') ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
            >
              <Terminal class="w-4 h-4" />
              <span>{t('nav.logs')}</span>
            </a>
            <a
              href="/settings"
              class="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors {$page.url.pathname.startsWith('/settings') ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
            >
              <Sliders class="w-4 h-4" />
              <span>{t('nav.settings')}</span>
            </a>
          </nav>
        </div>

        <!-- Right: Status, Language Selector, Theme Toggle, Restart, Logout -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Theme Toggle -->
          <ThemeToggle />

          <!-- Language Selector -->
          <div class="relative">
            <button
              type="button"
              onclick={() => (isLangMenuOpen = !isLangMenuOpen)}
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-medium transition-colors"
              title="Change Language"
            >
              <span class="text-base leading-none select-none">{currentLocaleOption.flag}</span>
              <span class="hidden sm:inline">{currentLocaleOption.label}</span>
              <ChevronDown class="w-3 h-3 text-slate-500" />
            </button>

            {#if isLangMenuOpen}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="fixed inset-0 z-40"
                onclick={() => (isLangMenuOpen = false)}
              ></div>
              <div class="absolute right-0 mt-1.5 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 text-xs">
                {#each SUPPORTED_LOCALES as loc}
                  <button
                    type="button"
                    onclick={() => selectLanguage(loc.code)}
                    class="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors {i18n.locale === loc.code ? 'text-indigo-400 font-semibold bg-indigo-600/10' : 'text-slate-300'}"
                  >
                    <span class="flex items-center gap-2">
                      <span class="text-base leading-none select-none">{loc.flag}</span>
                      <span>{loc.label}</span>
                    </span>
                    {#if i18n.locale === loc.code}
                      <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Container Status Badge -->
          <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-900 border-slate-800">
            {#if data.container.status === 'running'}
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-emerald-400 font-mono">podsync: {t('nav.statusRunning')}</span>
            {:else if data.container.status === 'exited'}
              <span class="w-2 h-2 rounded-full bg-slate-500"></span>
              <span class="text-slate-400 font-mono">podsync: {t('nav.statusStopped')}</span>
            {:else}
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span class="text-amber-400 font-mono">podsync: {data.container.status}</span>
            {/if}
          </div>

          <!-- Explicit Restart Button (변경사항이 있을 때만 활성화) -->
          {#if data.hasPendingChanges}
            <button
              onclick={handleOpenApplyModal}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all animate-pulse"
              title={t('nav.changesPending')}
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{t('nav.syncRestart')}</span>
            </button>
          {:else}
            <button
              onclick={handleOpenApplyModal}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
              title={t('nav.noChanges')}
            >
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-500" />
              <span>{t('nav.noChanges')}</span>
            </button>
          {/if}

          <!-- Logout Button -->
          <button
            type="button"
            onclick={handleLogout}
            class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Message Alert Toast -->
      {#if restartMessage}
        <div class="border-t border-slate-800 px-4 py-2 flex items-center justify-center gap-2 text-xs {restartMessage.type === 'success' ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'}">
          {#if restartMessage.type === 'success'}
            <CheckCircle2 class="w-4 h-4 text-emerald-400" />
          {:else}
            <AlertCircle class="w-4 h-4 text-rose-400" />
          {/if}
          <span>{restartMessage.text}</span>
        </div>
      {/if}
    </header>
  {/if}

  <main class="flex-1">
    {@render children()}
  </main>

  <!-- Diff 검토 및 즉시 편집 모달 -->
  <ApplyModal
    isOpen={isApplyModalOpen}
    onClose={() => (isApplyModalOpen = false)}
    onRestartComplete={handleRestartComplete}
  />
</div>
