/**
 * BIOGLOW Forest – Mehrsprachigkeit. Jede Sprache = eine Datei in src/i18n/<code>.js.
 * Gerätesprache wird erkannt, Fallback Englisch, umschaltbar in den Einstellungen.
 * checks/i18n_check.mjs prüft, dass jede Sprache jeden Schlüssel hat und jeder t('…') existiert.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import de from './de.js';
import en from './en.js';

export const LANGUAGES = { de: { name: 'Deutsch', dict: de }, en: { name: 'English', dict: en }, pt: { name: 'Português (Brasil)', dict: null, load: () => import('./pt.js') },
  es: { name: 'Español', dict: null, load: () => import('./es.js') },
  fr: { name: 'Français', dict: null, load: () => import('./fr.js') } };
// Weitere Sprachen werden erst bei Bedarf geladen (Start-Bundle klein halten); DE/EN sind immer da.
/** Sprachcode für Spracherkennung (Diktieren). */
export const SPEECH_LANG = { de: 'de-DE', en: 'en-GB', pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR' };
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
  const dict = (LANGUAGES[lang] || LANGUAGES[FALLBACK]).dict || LANGUAGES[FALLBACK].dict;
  let s = dict[key] ?? LANGUAGES[FALLBACK].dict[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);
  const [, setLoaded] = useState(0);
  const entry = LANGUAGES[lang];
  const ready = !entry || !!entry.dict;
  useEffect(() => {
    document.documentElement.lang = lang;
    if (entry && !entry.dict && entry.load) {
      entry.load().then((m) => { entry.dict = m.default; setLoaded((n) => n + 1); })
        .catch(() => { entry.dict = LANGUAGES[FALLBACK].dict; setLoaded((n) => n + 1); });
    }
  }, [lang, entry]);
  const value = useMemo(() => ({
    lang,
    setLang: (l) => { try { localStorage.setItem('forest.lang', l); } catch { /* ignore */ } document.documentElement.lang = l; setLangState(l); },
    t: (key, vars) => translate(lang, key, vars),
    num: (x, digits = 1) => Number(x).toLocaleString(lang, { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
    date: (iso) => new Date(iso).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' }),
  }), [lang, ready]);
  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
