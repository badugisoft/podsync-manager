<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon, Monitor, Check } from '@lucide/svelte';
  import { theme, type ThemeMode } from '$lib/theme/index.svelte';
  import { t } from '$lib/i18n/index.svelte';

  let isOpen = $state(false);

  onMount(() => {
    theme.init();
  });

  const options: { mode: ThemeMode; labelKey: string; icon: typeof Sun }[] = [
    { mode: 'light', labelKey: 'theme.light', icon: Sun },
    { mode: 'dark', labelKey: 'theme.dark', icon: Moon },
    { mode: 'system', labelKey: 'theme.system', icon: Monitor }
  ];

  function selectMode(m: ThemeMode) {
    theme.setTheme(m);
    isOpen = false;
  }
</script>

<div class="relative">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 transition-colors shadow-sm"
    title={t('theme.title')}
    aria-label={t('theme.title')}
  >
    {#if theme.mode === 'light'}
      <Sun class="w-4 h-4 text-amber-500" />
    {:else if theme.mode === 'dark'}
      <Moon class="w-4 h-4 text-indigo-400" />
    {:else}
      {#if theme.resolved === 'light'}
        <Sun class="w-4 h-4 text-amber-500" />
      {:else}
        <Monitor class="w-4 h-4 text-slate-400" />
      {/if}
    {/if}
  </button>

  {#if isOpen}
    <!-- Backdrop to close -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-40" onclick={() => (isOpen = false)}></div>

    <div
      class="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 text-xs"
    >
      {#each options as opt}
        {@const Icon = opt.icon}
        <button
          type="button"
          onclick={() => selectMode(opt.mode)}
          class="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/80 transition-colors {theme.mode === opt.mode ? 'text-indigo-400 font-semibold bg-slate-800/50' : 'text-slate-300'}"
        >
          <span class="flex items-center gap-2">
            <Icon class="w-3.5 h-3.5 {opt.mode === 'light' ? 'text-amber-500' : opt.mode === 'dark' ? 'text-indigo-400' : 'text-slate-400'}" />
            <span>{t(opt.labelKey)}</span>
          </span>
          {#if theme.mode === opt.mode}
            <Check class="w-3.5 h-3.5 text-indigo-400" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
