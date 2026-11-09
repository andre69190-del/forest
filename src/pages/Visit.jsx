import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n/i18n.jsx';
import { db } from '../lib/db.js';
import { createEvidence } from '../lib/evidence.js';
import { visitPdf } from '../lib/pdf.js';
import PositionPicker from '../components/PositionPicker.jsx';
import Camera from '../components/Camera.jsx';
import { Card, Field, Notice, PageHeader, downloadBlob } from '../components/ui.jsx';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function Visit() {
  const { t, lang, date } = useI18n();
  const [pos, setPos] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [f, setF] = useState({ place: '', country: '', forestType: '', people: '', notes: '' });
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const rec = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const visits = useLiveQuery(() => db.records.where('kind').equals('visit').reverse().sortBy('createdAt'), [], []);

  const dictate = () => {
    if (!SpeechRecognition) { setMsg({ kind: 'warn', text: t('visit.noSpeech') }); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SpeechRecognition();
    r.lang = lang === 'de' ? 'de-DE' : 'en-GB';
    r.interimResults = false; r.continuous = true;
    r.onresult = (e) => {
      const text = [...e.results].slice(e.resultIndex).map((x) => x[0].transcript).join(' ');
      setF((old) => ({ ...old, notes: `${old.notes}${old.notes ? ' ' : ''}${text}`.trim() }));
    };
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await createEvidence('visit', { ...f, country: f.country.trim().toUpperCase() }, { position: pos, photos });
      setF({ place: '', country: '', forestType: '', people: '', notes: '' }); setPhotos([]); setPos(null);
      setMsg({ kind: 'ok', text: t('common.saved') });
    } catch (e) { setMsg({ kind: 'error', text: t('common.error', { msg: e.message }) }); }
    setBusy(false);
  };

  const pdf = async (v) => {
    const rows = await Promise.all((v.media || []).map((m) => db.media.get(m.id)));
    const blob = await visitPdf({ t, visit: v, photoRows: rows.filter(Boolean) });
    downloadBlob(blob, `Feldbesuch_${(v.data.place || 'Besuch').replace(/[^\w-]+/g, '_')}_${v.createdAt.slice(0, 10)}.pdf`);
  };

  return (
    <div className="page">
      <PageHeader title={t('visit.title')} back />
      <Card>
        <Field label={t('visit.place')}><input value={f.place} onChange={set('place')} placeholder={t('visit.placePh')} /></Field>
        <div className="grid2">
          <Field label={t('visit.country')}><input value={f.country} onChange={set('country')} maxLength={2} placeholder="BR" /></Field>
          <Field label={t('visit.forestType')}><input value={f.forestType} onChange={set('forestType')} placeholder={t('visit.forestTypePh')} /></Field>
        </div>
        <Field label={t('pos.title')}><PositionPicker value={pos} onChange={setPos} /></Field>
        <Field label={t('cam.title')} hint={t('visit.photosHint')}><Camera photos={photos} onChange={setPhotos} max={8} /></Field>
        <Field label={t('visit.people')}><input value={f.people} onChange={set('people')} placeholder={t('visit.peoplePh')} /></Field>
        <Field label={t('visit.notes')}>
          <textarea rows={5} value={f.notes} onChange={set('notes')} />
        </Field>
        <button type="button" className={`btn ${listening ? 'btn-primary' : ''}`} onClick={dictate}>{listening ? t('visit.dictating') : t('visit.dictate')}</button>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <div className="card-actions"><button type="button" className="btn btn-primary" onClick={save} disabled={busy || !f.place.trim()}>{busy ? t('common.saving') : t('common.save')}</button></div>
      </Card>
      {visits.length > 0 && (
        <Card title={t('visit.list')}>
          <ul className="list">
            {visits.map((v) => (
              <li key={v.id} className="list-item row-between">
                <span><strong>{v.data.place}</strong><span>{date(v.createdAt)} · {v.data.country}</span></span>
                <button type="button" className="btn" onClick={() => pdf(v)}>{t('visit.caseStudy')}</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
