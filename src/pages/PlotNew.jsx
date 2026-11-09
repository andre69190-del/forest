import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { averageFixes, validatePolygon, perimeterM, polygonAreaM2, m2ToHa } from '../lib/geo.js';
import { createEvidence } from '../lib/evidence.js';
import { toPos } from '../lib/media.js';
import { getSetting } from '../lib/db.js';
import PlotMap from '../components/PlotMap.jsx';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';

const AVERAGE_SECONDS = 10;

export default function PlotNew() {
  const { t, num } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [mode, setMode] = useState('walk');
  const [points, setPoints] = useState([]);
  const [averaging, setAveraging] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const watch = useRef(null);

  const v = useMemo(() => validatePolygon(points), [points]);
  const areaHa = m2ToHa(polygonAreaM2(points));

  const addVertex = () => {
    if (!('geolocation' in navigator)) { setErr(t('pos.error')); return; }
    const samples = [];
    setAveraging(0); setErr(null);
    watch.current = navigator.geolocation.watchPosition(
      (p) => { samples.push(toPos(p)); setAveraging(samples.length); },
      () => {}, { enableHighAccuracy: true, maximumAge: 0 },
    );
    setTimeout(() => {
      navigator.geolocation.clearWatch(watch.current);
      const avg = averageFixes(samples);
      setAveraging(null);
      if (!avg) { setErr(t('pos.error')); return; }
      setPoints((ps) => [...ps, { lat: avg.lat, lng: avg.lng, accuracy: Math.round(avg.accuracy * 10) / 10, n: avg.n }]);
    }, AVERAGE_SECONDS * 1000);
  };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const country = (await getSetting('producerCountry', '')) || null;
      const rec = await createEvidence('plot', { plotKey: crypto.randomUUID(), name: name.trim(), points, method: mode, country, areaHa: v.areaHa },
        { position: points[0] ? { ...points[0], timestamp: Date.now() } : null });
      nav(`/flaechen/${rec.data.plotKey}`);
    } catch (e) { setErr(t('common.error', { msg: e.message })); setBusy(false); }
  };

  return (
    <div className="page">
      <PageHeader title={t('capture.plot')} back />
      <Card>
        <Field label={t('plot.name')}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('plot.namePh')} /></Field>
        <div className="segmented" role="group">
          {['walk', 'map'].map((m) => <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t(`plot.mode.${m}`)}</button>)}
        </div>
        <PlotMap polygon={points} onClick={mode === 'map' ? (p) => setPoints((ps) => [...ps, p]) : null} height={320} />
        <div className="row">
          {mode === 'walk' && (
            <button type="button" className="btn btn-primary" onClick={addVertex} disabled={averaging !== null}>
              {averaging !== null ? t('plot.averaging', { n: averaging }) : t('plot.addVertex', { s: AVERAGE_SECONDS })}
            </button>
          )}
          <button type="button" className="btn" onClick={() => setPoints((ps) => ps.slice(0, -1))} disabled={!points.length}>{t('plot.undo')}</button>
        </div>
        <p className="muted">{t('plot.points', { n: points.length })}</p>
        {points.length >= 3 && (
          <>
            <p><strong>{t('plot.area', { ha: num(areaHa, 2) })}</strong> · {t('plot.perimeter', { m: num(perimeterM(points), 0) })}</p>
            <Notice>{v.needsPolygon ? t('plot.eudrPolygon') : t('plot.eudrPoint')}</Notice>
          </>
        )}
        {v.issues.filter((i) => points.length >= 3 || i === 'too_few_points').map((i) => <Notice key={i} kind="warn">{t(`plot.issue.${i}`)}</Notice>)}
        {err && <Notice kind="error">{err}</Notice>}
        <div className="card-actions">
          <button type="button" className="btn btn-primary" disabled={!v.ok || !name.trim() || busy} onClick={save}>{busy ? t('common.saving') : t('common.save')}</button>
        </div>
      </Card>
    </div>
  );
}
