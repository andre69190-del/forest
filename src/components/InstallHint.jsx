/**
 * Hinweis „Als App installieren": Android/Chrome per Knopf, iPhone per Anleitung (Safari → Teilen).
 * compact: auf der Startseite wegklickbar (merkt sich das), in „Über“ immer sichtbar.
 */
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import { Card } from './ui.jsx';

let deferred = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
}

export function isStandalone() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
}

export default function InstallHint({ compact = false }) {
  const { t } = useI18n();
  const settings = useSettings();
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const h = () => setCanPrompt(true);
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (isStandalone()) return null;
  if (compact && (!settings.loaded || settings.installHintDone)) return null;
  return (
    <Card title={t('install.title')} actions={compact && (
      <button type="button" className="btn-link" onClick={() => settings.update('installHintDone', true)}>{t('install.dismiss')}</button>
    )}>
      {canPrompt ? (
        <button type="button" className="btn btn-primary" onClick={async () => { await deferred.prompt(); deferred = null; setCanPrompt(false); }}>{t('install.button')}</button>
      ) : (
        <p>{ios ? t('install.ios') : t('install.android')}</p>
      )}
      <p className="muted">{t('install.why')}</p>
    </Card>
  );
}
