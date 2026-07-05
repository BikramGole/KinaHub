import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Locale } from './localeStore';
import { getStoredLocale, setCurrentLocale, getLocaleDirection, LOCALE_STORAGE_KEY } from './localeStore';

type TranslationDict = Record<string, unknown>;

const lazyFiles = import.meta.glob<{ default: TranslationDict }>('./messages/**/*.json');

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: Record<string, string | number> & { defaultValue?: string }) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function pathToKey(path: string): string | null {
  const match = path.match(/\.\/messages\/(en|np)\/([^/]+)\.json$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function localeNamespacePaths(locale: Locale): string[] {
  return Object.keys(lazyFiles).filter(p => p.startsWith(`./messages/${locale}/`));
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale());
  const [ready, setReady] = useState(false);
  const cache = useRef<Record<string, TranslationDict>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const paths = localeNamespacePaths(locale);
      const enPaths = locale !== 'en' ? localeNamespacePaths('en') : [];
      await Promise.all([
        ...paths.map(p => lazyFiles[p]().then(m => { if (!cancelled) cache.current[pathToKey(p)!] = m.default; })),
        ...enPaths.map(p => lazyFiles[p]().then(m => { if (!cancelled) cache.current[pathToKey(p)!] = m.default; })),
      ]);
      if (!cancelled) setReady(true);
    }
    load();
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
    setCurrentLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: string, options?: Record<string, string | number> & { defaultValue?: string }): string => {
      const parts = key.split('.');
      const namespace = parts[0];
      const translationKey = parts.slice(1).join('.');

      const lookup = (lang: Locale) => {
        const module = cache.current[`${lang}/${namespace}`];
        if (!module) return undefined;

        return translationKey.split('.').reduce<unknown>((current, segment) => {
          if (!current || typeof current !== 'object') return undefined;
          return (current as Record<string, unknown>)[segment];
        }, module);
      };

      const defaultValue = options?.defaultValue;
      const variables = options
        ? Object.fromEntries(Object.entries(options).filter(([name]) => name !== 'defaultValue'))
        : undefined;

      let text: unknown = lookup(locale);

      if (!text && locale !== 'en') {
        text = lookup('en');
      }

      if (typeof text !== 'string') {
        if (typeof defaultValue === 'string') return defaultValue;
        if (import.meta.env.DEV && ready) {
          console.warn(`[i18n] Missing translation for key: ${key}`);
        }
        return key;
      }

      let resolved = text;
      if (variables) {
        Object.entries(variables).forEach(([k, v]) => {
          resolved = resolved.replace(`{${k}}`, String(v));
        });
      }

      return resolved;
    },
    [locale, ready]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
