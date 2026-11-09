import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { createEvidence } from '../lib/evidence.js';
import { lineIntersectVolume, standingVolume, DECAY_CLASSES } from '../lib/forestry.js';
import PositionPicker from '../components/PositionPicker.jsx';
import Camera from '../components/Camera.jsx';
import PlotSelect from '../components/PlotSelect.jsx';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';

export default function Deadwood() {
  const { t, num } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState('line');
  const [plotId, setPlotId] = useState(params.get('flaeche'));
  const [pos, setPos] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [lineM, setLineM] = useState('100');
  const [pieces, setPieces] = useState([]);
  const [d, setD] = useState('');
  const [decay, setDecay] = useState(2);
  const [standing, setStanding] = useState({ bhdCm: '', heightM: '', decay: 2 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const volume = lineIntersectVolume(pieces.map((p) => p.diameterCm), Number(lineM));
  const sVol = standing.bhdCm && standing.heightM ? standingVolume(Number(standing.bhdCm), Number(standing.heightM)) : null;

  const add = () => { if (Number(d) > 0) { setPieces([...pieces, { diameterCm: Number(d), decay }]); setD(''); } };
  const save = async () => {
    if (!pos) { setErr(t('tree.needPos')); return; }
    setBusy(true); setErr(null);
    try {
      if (mode === 'line') {
        await createEvidence('deadwood_line', { lineLengthM: Number(lineM), pieces, minDiameterCm: 10, volumeM3Ha: Math.round(volume * 100) / 100 }, { position: pos, photos, plotId });
      } else {
        await createEvidence('deadwood_standing', { bhdCm: Number(standing.bhdCm), heightM: Number(standing.heightM), decay: Number(standing.decay), volumeM3: Math.round(sVol * 1000) / 1000 }, { position: pos, photos, plotId });
      }
      nav(plotId ? `/flaechen/${plotId}` : '/nachweise');
    } catch (e) { setErr(t('common.error', { msg: e.message })); setBusy(false); }
  };

  const decaySelect = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {DECAY_CLASSES.map((c) => <option key={c} value={c}>{t(`dw.decay.${c}`)}</option>)}
    </select>
  );

  return (
    <div className="page">
      <PageHeader title={t('dw.title')} back />
      <Card>
        <div className="segmented" role="group">
          {['line', 'standing'].map((m) => <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{t(`dw.mode.${m}`)}</button>)}
        </div>
        <Field label={t('common.plot')}><PlotSelect value={plotId} onChange={setPlotId} /></Field>
        <Field label={t('pos.title')}><PositionPicker value={pos} onChange={setPos} /></Field>
        {mode === 'line' ? (
          <>
            <Field label={t('dw.lineLength')}><input type="number" inputMode="decimal" min="1" value={lineM} onChange={(e) => setLineM(e.target.value)} /></Field>
            <div className="grid2">
              <Field label={t('dw.diameter')}><input type="number" inputMode="decimal" min="0" value={d} onChange={(e) => setD(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /></Field>
              <Field label={t('dw.decay')}>{decaySelect(decay, setDecay)}</Field>
            </div>
            <button type="button" className="btn" onClick={add}>{t('dw.addPiece')}</button>
            <p className="muted">{t('dw.pieces', { n: pieces.length })} · {t('dw.min10')}</p>
            {pieces.length > 0 && <ul className="chips">{pieces.map((p, i) => <li key={i}>{p.diameterCm} cm · {p.decay} <button type="button" aria-label={t('common.delete')} onClick={() => setPieces(pieces.filter((_, j) => j !== i))}>×</button></li>)}</ul>}
            <p className="big">{t('dw.volume', { v: num(volume, 1) })}</p>
          </>
        ) : (
          <>
            <div className="grid2">
              <Field label={t('tree.bhd')}><input type="number" inputMode="decimal" value={standing.bhdCm} onChange={(e) => setStanding({ ...standing, bhdCm: e.target.value })} /></Field>
              <Field label={t('tree.height')}><input type="number" inputMode="decimal" value={standing.heightM} onChange={(e) => setStanding({ ...standing, heightM: e.target.value })} /></Field>
            </div>
            <Field label={t('dw.decay')}>{decaySelect(standing.decay, (v) => setStanding({ ...standing, decay: v }))}</Field>
            {sVol != null && <p className="big">{t('dw.standingVolume', { v: num(sVol, 2) })}</p>}
          </>
        )}
        <Field label={`${t('cam.title')} (${t('common.optional')})`}><Camera photos={photos} onChange={setPhotos} max={3} /></Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="card-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || (mode === 'line' ? !(Number(lineM) > 0) : sVol == null)}>{busy ? t('common.saving') : t('common.save')}</button>
        </div>
      </Card>
    </div>
  );
}
