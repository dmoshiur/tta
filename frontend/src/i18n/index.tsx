import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { en } from './en.ts';
import { bn } from './bn.ts';

/**
 * ThinkTank Academia — localization system.
 *
 * Languages:
 *   en — English (default)
 *   bn — বাংলা (Bangla)
 *
 * The dictionary is keyed with dot-notation paths ("nav.courses").
 * Missing keys gracefully fall back to English, then to the raw key,
 * so partially translated areas never render blank.
 */

export type Lang = 'en' | 'bn';

export const LANGS: { id: Lang; label: string; nativeLabel: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', label: 'EN', nativeLabel: 'English', dir: 'ltr' },
  { id: 'bn', label: 'বাং', nativeLabel: 'বাংলা', dir: 'ltr' },
];

const DICTS: Record<Lang, Record<string, any>> = { en, bn };

const STORAGE_KEY = 'tta_lang';

function lookup(dict: Record<string, any>, key: string): string | undefined {
  const value = key.split('.').reduce<any>((acc, part) => (acc == null ? undefined : acc[part]), dict);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
}

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'bn') return saved;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn')) return 'bn';
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const meta = LANGS.find((l) => l.id === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.dir || 'ltr';
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const value = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
      return interpolate(value, vars);
    },
    [lang]
  );

  const dir = LANGS.find((l) => l.id === lang)?.dir || 'ltr';

  return <I18nContext.Provider value={{ lang, setLang, t, dir }}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/**
 * LanguageSwitcher — premium segmented EN | বাং control.
 * Renders inline; sizing variants are handled in CSS.
 */
export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang-switcher${compact ? ' compact' : ''}`} role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`lang-option${lang === l.id ? ' active' : ''}`}
          onClick={() => setLang(l.id)}
          aria-pressed={lang === l.id}
          lang={l.id}
        >
          {compact ? l.label : l.nativeLabel}
        </button>
      ))}
    </div>
  );
};
