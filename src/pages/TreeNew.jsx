import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { createEvidence } from '../lib/evidence.js';
import PositionPicker from '../components/PositionPicker.jsx';
import Camera from '../components/Camera.jsx';
import TremPicker from '../components/TremPicker.jsx';
import PlotSelect from '../components/PlotSelect.jsx';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';

export default function TreeNew() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [plotId, setPlotId] = useState(params.get('flaeche'));
  const [pos, setPos] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [f, setF] = useState({ species: '', bhdCm: '', heightM: '', alive: true, marking: '', note: '' });
  const [trems, setTrems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!pos) { setErr(t('tree.needPos')); return; }
    if (!photos.length) { setErr(t('tree.needPhoto')); return; }
    setBusy(true); setErr(null);
    try {
      await createEvidence('habitat_tree', {
        species: f.species.trim(), bhdCm: f.bhdCm ? Number(f.bhdCm) : null, heightM: f.heightM ? Number(f.heightM) : null,
        alive: f.alive, marking: f.marking.trim(), note: f.note.trim(), trems,
      }, { position: pos, photos, plotId });
      nav(plotId ? `/flaechen/${plotId}` : '/nachweise');
    } catch (e) { setErr(t('common.error', { msg: e.message })); setBusy(false); }
  };

  return (
    <div className="page">
      <PageHeader title={t('tree.title')} back />
      <Card>
        <Field label={t('common.plot')}><PlotSelect value={plotId} onChange={setPlotId} /></Field>
        <Field label={t('pos.title')}><PositionPicker value={pos} onChange={setPos} /></Field>
        <Field label={t('cam.title')}><Camera photos={photos} onChange={setPhotos} /></Field>
        <Field label={t('tree.species')}><input value={f.species} onChange={set('species')} placeholder={t('tree.speciesPh')} /></Field>
        <div className="grid2">
          <Field label={t('tree.bhd')}><input type="number" inputMode="decimal" min="0" max="500" value={f.bhdCm} onChange={set('bhdCm')} /></Field>
          <Field label={`${t('tree.height')} (${t('common.optional')})`}><input type="number" inputMode="decimal" min="0" max="120" value={f.heightM} onChange={set('heightM')} /></Field>
        </div>
        <Field label={t('tree.alive')}>
          <select value={f.alive ? '1' : '0'} onChange={(e) => setF({ ...f, alive: e.target.value === '1' })}>
            <option value="1">{t('tree.alive.yes')}</option><option value="0">{t('tree.alive.no')}</option>
          </select>
        </Field>
        <Field label={t('tree.marking')}><input value={f.marking} onChange={set('marking')} placeholder={t('tree.markingPh')} /></Field>
      </Card>
      <Card title={t('tree.trems')}>
        <p className="muted">{t('tree.tremsHint')}</p>
        <TremPicker value={trems} onChange={setTrems} />
      </Card>
      <Card>
        <Field label={t('common.note')}><textarea rows={3} value={f.note} onChange={set('note')} /></Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="card-actions"><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? t('common.saving') : t('common.save')}</button></div>
      </Card>
    </div>
  );
}
