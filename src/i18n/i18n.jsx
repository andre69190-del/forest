/**
 * BIOGLOW Forest – Mehrsprachigkeit. Jede Sprache = eine Datei in src/i18n/<code>.js.
 * Gerätesprache wird erkannt, Fallback Englisch, umschaltbar in den Einstellungen.
 * checks/i18n_check.mjs prüft, dass jede Sprache jeden Schlüssel hat und jeder t('…') existiert.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import de from './de.js';
import en from './en.js';

export const LANGUAGES = { de: { name: 'Deutsch', dict: de }, en: { name: 'English', dict: en } };
export const FALLBACK = 'en';

export function detectLanguage() {
  try {
    const saved = localStorage.getItem('forest.lang');
    if (saved && LANGUAGES[saved]) return saved;
  } catch { /* privater Modus */ }
  const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || FALLBACK]);
  for (const l of list) {
    const code = String(l).slice(0, 2).toLowerCase();
    if (LANGUAGES[code]) return code;
  }
  return FALLBACK;
}

export function translate(lang, key, vars) {
  const dict = (LANGUAGES[lang] || LANGUAGES[FALLBACK]).dict;
  let s = dict[key] ?? LANGUAGES[FALLBACK].dict[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);
  const value = useMemo(() => ({
    lang,
    setLang: (l) => { try { localStorage.setItem('forest.lang', l); } catch { /* ignore */ } document.documentElement.lang = l; setLangState(l); },
    t: (key, vars) => translate(lang, key, vars),
    num: (x, digits = 1) => Number(x).toLocaleString(lang, { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
    date: (iso) => new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' }),
  }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
