import { useContext } from 'react';
import { I18nContext } from './context';

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand for the common case. */
export function useT() {
  return useI18n().t;
}
