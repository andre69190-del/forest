/** Knopf „Art per KI bestimmen“ unter den Fotos; Treffer antippen übernimmt die Art. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings, useOnline } from '../App.jsx';
import { identifySpecies, speciesLabel, hasPlantnetKey } from '../lib/species.js';
import { Notice } from './ui.jsx';

export default function SpeciesId({ photos, onPick }) {
  const { t, lang } = useI18n();
  const settings = useSettings();
  const online = useOnline();
  const [organ, setOrgan] = useState('bark');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  if (!photos.length) return null;
  if (!hasPlantnetKey(settings.plantnetKey)) return <p className="muted">{t('species.noKeyHint')} <Link to="/mehr">{t('more.settings')}</Link></p>;
  const run = async () => {
    setBusy(true); setErr(null); setRes(null);
    try {
      setRes(await identifySpecies(photos, { key: settings.plantnetKey || undefined, lang, organ }));
    } catch (e) { setErr(t(`species.err.${['no_key', 'not_a_plant', 'quota', 'network'].includes(e.code) ? e.code : 'other'}`)); }
    setBusy(false);
  };
  return (
    <div className="species">
      <div className="row">
        <select value={organ} onChange={(e) => setOrgan(e.target.value)} aria-label={t('species.organ')} style={{ width: 'auto' }}>
          {['bark', 'leaf', 'habit', 'fruit', 'flower', 'auto'].map((o) => <option key={o} value={o}>{t(`species.organ.${o}`)}</option>)}
        </select>
        <button type="button" className="btn" onClick={run} disabled={busy || !online}>{busy ? t('species.busy') : t('species.button')}</button>
      </div>
      {!online && <p className="muted">{t('species.offline')}</p>}
      {err && <Notice kind="warn">{err}</Notice>}
      {res && (
        <ul className="list">
          {res.results.map((r) => (
            <li key={r.scientificName}>
              <button type="button" className="list-item list-button" onClick={() => onPick(speciesLabel(r), { service: 'plantnet', score: r.score, scientificName: r.scientificName })}>
                <span className="row-between"><strong>{speciesLabel(r)}</strong><span>{r.score} %</span></span>
              </button>
            </li>
          ))}
          <li className="muted">{t('species.hint')}</li>
        </ul>
      )}
    </div>
  );
}
