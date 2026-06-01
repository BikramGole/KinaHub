export type Locale = 'en' | 'np';

export const LOCALE_STORAGE_KEY = 'kinahub_locale';

const localeLabels: Record<Locale, string> = {
  en: 'English',
  np: 'नेपाली',
};

const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  np: 'ltr',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'np';
}

let currentLocale: Locale = getStoredLocale();
const listeners = new Set<(locale: Locale) => void>();

export function getLocaleLabel(locale: Locale) {
  return localeLabels[locale];
}

export function getLocaleDirection(locale: Locale) {
  return localeDirections[locale];
}

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) return stored;
  return 'en';
}

export function getCurrentLocale() {
  return currentLocale;
}

export function setCurrentLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener: (locale: Locale) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
