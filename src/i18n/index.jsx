import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import { ANTD_LOCALE, I18nContext, LANGUAGES, STORAGE_KEY } from './context';
import { en } from './en';
import { fr } from './fr';

/**
 * Translation, with no dependency beyond what's already here.
 *
 *   t('nav.discover')                     -> "Discover" / "Découvrir"
 *   t('media.count', { count: 3 })        -> interpolates {count}
 *   t('media.item', { count: 3 })         -> picks media.item_one / _other
 *
 * A missing key falls back to English, then to the key itself, so an
 * untranslated string degrades to readable text rather than blanks.
 */

const DICTS = { en, fr };
export { LANGUAGES };


function lookup(dict, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dict);
}

function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (whole, key) => (key in vars ? String(vars[key]) : whole));
}

function detectInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language ?? '' : '';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial);

  useEffect(() => {
    dayjs.locale(lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* choice just won't persist */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      // Plural form: prefer key_one / key_other when a count is supplied.
      if (vars && typeof vars.count === 'number') {
        const suffix = vars.count === 1 ? '_one' : '_other';
        const plural = lookup(DICTS[lang], key + suffix) ?? lookup(DICTS.en, key + suffix);
        if (plural != null) return interpolate(plural, vars);
      }
      const value = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key);
      return value == null ? key : interpolate(value, vars);
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, antdLocale: ANTD_LOCALE[lang] ?? ANTD_LOCALE.en }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
