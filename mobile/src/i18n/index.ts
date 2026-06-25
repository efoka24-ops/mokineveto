import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fr } from './fr';
import { en } from './en';
import { ff } from './ff';

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ff', label: 'Fulfulde' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

const STORAGE_KEY = 'mokinevet.lang';

function detectDefault(): LangCode {
  const code = getLocales()[0]?.languageCode ?? 'fr';
  if (code === 'en') return 'en';
  if (code === 'ff') return 'ff';
  return 'fr';
}

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, ff: { translation: ff } },
  lng: detectDefault(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

// Restaure la langue choisie par l'utilisateur.
AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
  if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
});

export async function setLanguage(code: LangCode) {
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export default i18n;
