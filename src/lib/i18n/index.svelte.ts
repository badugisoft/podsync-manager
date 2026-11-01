import { translations, SUPPORTED_LOCALES, type Locale } from './translations';

const STORAGE_KEY = 'podsync_language';
const DEFAULT_LOCALE: Locale = 'en';

class I18nStore {
  locale = $state<Locale>(DEFAULT_LOCALE);

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && (saved === 'en' || saved === 'ko' || saved === 'ja' || saved === 'zh')) {
        this.locale = saved;
      } else {
        // 브라우저 언어 감지
        const navLang = navigator.language?.toLowerCase() || '';
        if (navLang.startsWith('ko')) this.locale = 'ko';
        else if (navLang.startsWith('ja')) this.locale = 'ja';
        else if (navLang.startsWith('zh')) this.locale = 'zh';
        else this.locale = 'en';
      }
    }
  }

  setLocale(newLocale: Locale) {
    if (newLocale !== this.locale) {
      this.locale = newLocale;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, newLocale);
        } catch {
          // 스토리지 예외 무시
        }
      }
    }
  }

  /**
   * 번역 키 조회 (예: t('nav.feeds'))
   */
  t(path: string, params?: Record<string, string | number>): string {
    const keys = path.split('.');
    let current: unknown = translations[this.locale];

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = (current as Record<string, unknown>)[k];
      } else {
        // 영문 기본값 폴백
        let fallback: unknown = translations[DEFAULT_LOCALE];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramVal));
      }, current);
    }

    return current;
  }
}

export const i18n = new I18nStore();
export const t = (path: string, params?: Record<string, string | number>) => i18n.t(path, params);
export { SUPPORTED_LOCALES, type Locale };
