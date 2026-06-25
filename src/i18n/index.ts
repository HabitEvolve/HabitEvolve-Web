import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import vi from '../locales/vi.json';

export const LANGUAGE_KEY = 'language';

const savedLanguage = localStorage.getItem(LANGUAGE_KEY) ?? 'vi';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
