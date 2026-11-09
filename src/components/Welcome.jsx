/**
 * Begrüßung beim ersten Start (einmalig). Schließen – egal wie – merkt sich „gesehen“;
 * danach nur noch über „Mehr → Begrüßung erneut zeigen“ bzw. den Link auf der Startseite.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n, LANGUAGES } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import { loadDemoForest } from '../lib/demo.js';
import { db } from '../lib/db.js';

export default function Welcome() {
  const { t, lang, setLang } = useI18n();
  const settings = useSettings();
  const nav = useNavigate();
  const dialog = useRef(null);
  const open = settings.loaded && !settings.welcomeDone;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const done = () => settings.update('welcomeDone', true);
  const demo = async () => {
    done();
    const has = await db.records.count();
    if (has) { nav('/flaechen'); return; }
    nav(`/flaechen/${await loadDemoForest()}`);
  };

  return (
    <dialog ref={dialog} className="welcome" aria-labelledby="welcome-title" onCancel={done}>
      <div className="welcome-body">
        <div className="row-between">
          <h2 id="welcome-title">{t('welcome.title')}</h2>
          <button type="button" className="icon-btn" aria-label={t('welcome.close')} onClick={done}>×</button>
        </div>
        <label className="welcome-lang">
          <span>{t('set.language')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.entries(LANGUAGES).map(([code, l]) => <option key={code} value={code}>{l.name}</option>)}
          </select>
        </label>
        <p>{t('info.lead')}</p>
        <ul className="bullets">
          <li>{t('welcome.b1')}</li>
          <li>{t('welcome.b2')}</li>
          <li>{t('welcome.b3')}</li>
        </ul>
        <p className="muted">{t('welcome.hobby')}</p>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={demo}>{t('welcome.demo')}</button>
          <button type="button" className="btn" onClick={done}>{t('welcome.start')}</button>
          <button type="button" className="btn-link" onClick={() => { done(); nav('/info'); }}>{t('welcome.more')}</button>
        </div>
      </div>
    </dialog>
  );
}
