/** Hinweis „Als App installieren": Android/Chrome per Knopf, iPhone per Anleitung (Safari → Teilen). */
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { Card } from './ui.jsx';

let deferred = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
}

export default function InstallHint() {
  const { t } = useI18n();
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const h = () => setCanPrompt(true);
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (standalone) return null;
  return (
    <Card title={t('install.title')}>
      {canPrompt ? (
        <button type="button" className="btn btn-primary" onClick={async () => { await deferred.prompt(); deferred = null; setCanPrompt(false); }}>{t('install.button')}</button>
      ) : (
        <p>{ios ? t('install.ios') : t('install.android')}</p>
      )}
      <p className="muted">{t('install.why')}</p>
    </Card>
  );
}
