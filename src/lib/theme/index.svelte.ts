export type ThemeMode = 'light' | 'dark' | 'system';

class ThemeState {
  mode = $state<ThemeMode>('system');
  resolved = $state<'light' | 'dark'>('dark');
  private initialized = false;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    try {
      const saved = localStorage.getItem('podsync_theme') as ThemeMode | null;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        this.mode = saved;
      } else {
        this.mode = 'system';
      }
    } catch {
      this.mode = 'system';
    }

    this.apply();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', () => {
      if (this.mode === 'system') {
        this.apply();
      }
    });
  }

  setTheme(newMode: ThemeMode) {
    this.mode = newMode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('podsync_theme', newMode);
      } catch {}
      this.apply();
    }
  }

  private apply() {
    if (typeof window === 'undefined') return;

    let target: 'light' | 'dark';
    if (this.mode === 'system') {
      target = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      target = this.mode;
    }

    this.resolved = target;

    const html = document.documentElement;
    if (target === 'light') {
      html.classList.remove('dark');
      html.classList.add('light');
      html.setAttribute('data-theme', 'light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    }
  }
}

export const theme = new ThemeState();
