/**
 * Habitatbaum im Detail: Fotos, Daten, Mikrohabitate, Vertrauensstufe, QR-Plakette,
 * Monitoring (Wiederholungsaufnahmen mit Vorher/Nachher).
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { createEvidence, verifyAll } from '../lib/evidence.js';
import { bytesToObjectUrl } from '../lib/media.js';
import { treeUrl, qrDataUrl } from '../lib/qr.js';
import { useI18n } from '../i18n/i18n.jsx';
import PlotMap from '../components/PlotMap.jsx';
import PositionPicker from '../components/PositionPicker.jsx';
import Camera from '../components/Camera.jsx';
import { Card, Field, Notice, PageHeader, TrustBadge } from '../components/ui.jsx';

function Photo({ mediaId, alt = '' }) {
  const row = useLiveQuery(() => db.media.get(mediaId), [mediaId]);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!row) return undefined;
    const u = bytesToObjectUrl(row.bytes, row.type); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [row]);
  return url ? <img className="photo" src={url} alt={alt} /> : <div className="photo photo-empty" />;
}

const CONDITIONS = ['unchanged', 'changed', 'dead_standing', 'fallen', 'felled'];

export default function TreeDetail() {
  const { id } = useParams();
  const { t, date, num } = useI18n();
  const [levels, setLevels] = useState(null);
  const [qr, setQr] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const data = useLiveQuery(async () => {
    const tree = await db.records.get(id);
    const revisits = (await db.records.where('kind').equals('tree_revisit').toArray())
      .filter((r) => r.data.treeId === id).sort((a, b) => a.seq - b.seq);
    return { tree, revisits };
  }, [id]);
  useEffect(() => { verifyAll().then((v) => setLevels(v.results)); }, [data?.revisits.length]);
  useEffect(() => { qrDataUrl(treeUrl(id)).then(setQr); }, [id]);
  if (!data) return null;
  const { tree, revisits } = data;
  if (!tree) {
    return (
      <div className="page">
        <PageHeader title={t('tree.title')} back />
        <Notice kind="warn">{t('tree.notHere')}</Notice>
        <p className="muted"><code>{id}</code></p>
      </div>
    );
  }
  const d = tree.data;
  const first = (tree.media || [])[0];
  const lastWithPhoto = [...revisits].reverse().find((r) => (r.media || []).length);

  const saveRevisit = async () => {
    try {
      await createEvidence('tree_revisit', { treeId: id, condition: form.condition, note: form.note.trim() },
        { position: form.pos, photos: form.photos, plotId: tree.plotId });
      setForm(null); setMsg(t('common.saved'));
    } catch (e) { setMsg(t('common.error', { msg: e.message })); }
  };

  return (
    <div className="page">
      <PageHeader title={d.species || t('tree.title')} back />
      {first && <Photo mediaId={first.id} alt={d.species} />}
      <Card>
        <div className="row-between"><strong>{t('ev.kind.habitat_tree')}</strong><TrustBadge level={levels?.get(tree.id)?.level} /></div>
        <dl className="details">
          <dt>{t('tree.bhd')}</dt><dd>{d.bhdCm ?? '–'}</dd>
          {d.heightM && <><dt>{t('tree.height')}</dt><dd>{d.heightM}</dd></>}
          <dt>{t('tree.alive')}</dt><dd>{d.alive ? t('tree.alive.yes') : t('tree.alive.no')}</dd>
          {d.marking && <><dt>{t('tree.marking')}</dt><dd>{d.marking}</dd></>}
          <dt>{t('tree.trems')}</dt><dd>{(d.tremTypes && d.tremTypes.length ? d.tremTypes.map((k) => t(`trem.t.${k}`)) : (d.trems || []).map((g) => t(`trem.${g}`))).join(', ') || '–'}</dd>
          {d.speciesAi && <><dt>{t('species.title')}</dt><dd>Pl@ntNet · {d.speciesAi.score} %</dd></>}
          <dt>{t('pos.title')}</dt><dd>{tree.position ? `${tree.position.lat.toFixed(6)}, ${tree.position.lng.toFixed(6)} (± ${num(tree.position.accuracy || 0, 0)} m)` : '–'}</dd>
          <dt>{t('ev.hash')}</dt><dd><code className="hash">{tree.hash}</code></dd>
        </dl>
        {tree.plotId && <Link className="btn" to={`/flaechen/${tree.plotId}`}>{t('tree.toPlot')}</Link>}
      </Card>
      {tree.position && <PlotMap markers={[tree.position]} height={200} />}

      <Card title={t('mon.title')}>
        <p className="muted">{t('mon.intro')}</p>
        {first && lastWithPhoto && (
          <div className="compare">
            <figure><Photo mediaId={first.id} /><figcaption>{t('mon.before')} · {date(tree.createdAt)}</figcaption></figure>
            <figure><Photo mediaId={lastWithPhoto.media[0].id} /><figcaption>{t('mon.after')} · {date(lastWithPhoto.createdAt)}</figcaption></figure>
          </div>
        )}
        {revisits.length > 0 && (
          <ul className="list">
            {revisits.map((r) => (
              <li key={r.id} className="list-item">
                <span className="row-between"><strong>{t(`mon.cond.${r.data.condition}`)}</strong><TrustBadge level={levels?.get(r.id)?.level} /></span>
                <span>{date(r.createdAt)}{r.data.note ? ` · ${r.data.note}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
        {form ? (
          <div className="page">
            <Field label={t('mon.condition')}>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{t(`mon.cond.${c}`)}</option>)}
              </select>
            </Field>
            <Field label={t('pos.title')}><PositionPicker value={form.pos} onChange={(pos) => setForm({ ...form, pos })} /></Field>
            <Field label={t('cam.title')} hint={t('mon.photoHint')}><Camera photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} max={3} /></Field>
            <Field label={t('common.note')}><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={saveRevisit}>{t('common.save')}</button>
              <button type="button" className="btn" onClick={() => setForm(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => { setMsg(null); setForm({ condition: 'unchanged', note: '', photos: [], pos: null }); }}>{t('mon.new')}</button>
        )}
        {msg && <Notice kind="ok">{msg}</Notice>}
      </Card>

      <Card title={t('qr.title')}>
        <p className="muted">{t('qr.single')}</p>
        {qr && <img className="qr" src={qr} alt={t('qr.title')} />}
      </Card>
    </div>
  );
}
