import en from './locales/en';
import ko from './locales/ko';
import ja from './locales/ja';
import zh from './locales/zh';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

export type Locale = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de';

export interface LocaleOption {
  code: Locale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸 🇬🇧' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
];

export const translations = {
  en,
  ko,
  ja,
  zh,
  es,
  fr,
  de
} as const;
