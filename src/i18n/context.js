import { createContext } from 'react';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

export const ANTD_LOCALE = { en: enUS, fr: frFR };
export const STORAGE_KEY = 'nightgals.lang';
export const I18nContext = createContext(null);
