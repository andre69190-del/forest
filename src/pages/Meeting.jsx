/**
 * Gesprächsnotiz (Konferenz, Termine): Person, Organisation, Themen, Diktat, Follow-up, Foto von
 * Namensschild/Visitenkarte. Signiert wie jeder Nachweis. Aktionen: Follow-up-Mail, Kontakt (vCard), CSV.
 */
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n/i18n.jsx';
import { db } from '../lib/db.js';
import { createEvidence, latestOnly } from '../lib/evidence.js';
import { TOPICS, toVCard, followUpMailto, toCsv } from '../lib/contacts.js';
import Camera from '../components/Camera.jsx';
import { Card, Field, Notice, PageHeader, downloadBlob } from '../components/ui.jsx';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const EMPTY = { name: '', org: '', role: '', email: '', phone: '', event: '', topics: [], notes: '', followUp: '', due: '' };

export default function Meeting() {
  const { t, lang, date } = useI18n();
  const [f, setF] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const rec = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = useLiveQuery(async () => latestOnly(await db.records.where('kind').equals('meeting').toArray()).sort((a, b) => b.seq - a.seq), [], []);

  const dictate = () => {
    if (!SpeechRecognition) { setMsg({ kind: 'warn', text: t('visit.noSpeech') }); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SpeechRecognition();
    r.lang = lang === 'de' ? 'de-DE' : 'en-GB'; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => {
      const text = [...e.results].slice(e.resultIndex).map((x) => x[0].transcript).join(' ');
      setF((o) => ({ ...o, notes: `${o.notes}${o.notes ? ' ' : ''}${text}`.trim() }));
    };
    r.onend = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await createEvidence('meeting', { ...f, name: f.name.trim(), org: f.org.trim(), email: f.email.trim() }, { photos });
      setF({ ...EMPTY, event: f.event }); setPhotos([]);
      setMsg({ kind: 'ok', text: t('common.saved') });
    } catch (e) { setMsg({ kind: 'error', text: t('common.error', { msg: e.message }) }); }
    setBusy(false);
  };

  const topicText = (d) => d.topics.map((x) => t(`meet.topic.${x}`)).join(', ');
  const mail = (r) => {
    const d = r.data;
    const body = t('meet.mail.body', { name: d.name.split(' ')[0] || d.name, event: d.event || t('meet.mail.eventFallback'), topics: topicText(d) || '–', followUp: d.followUp || '–' });
    window.location.href = followUpMailto(d, { subject: t('meet.mail.subject', { event: d.event || t('meet.mail.eventFallback') }), body });
  };
  const vcard = (r) => {
    const d = r.data;
    const note = [d.event, topicText(d), d.notes, d.followUp && `${t('meet.followUp')}: ${d.followUp}`].filter(Boolean).join(' · ');
    downloadBlob(new Blob([toVCard(d, note)], { type: 'text/vcard' }), `${(d.name || 'Kontakt').replace(/[^\w-]+/g, '_')}.vcf`);
  };
  const csv = () => {
    const header = [t('meet.name'), t('meet.org'), t('meet.role'), t('meet.email'), t('meet.phone'), t('meet.event'), t('meet.topics'), t('visit.notes'), t('meet.followUp'), t('meet.due'), t('ev.hash')];
    const rows = list.map((r) => { const d = r.data; return [d.name, d.org, d.role, d.email, d.phone, d.event, topicText(d), d.notes, d.followUp, d.due, r.hash]; });
    downloadBlob(new Blob([toCsv(rows, header)], { type: 'text/csv' }), `Gespraeche_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="page">
      <PageHeader title={t('meet.title')} back />
      <p className="muted">{t('meet.intro')}</p>
      <Card>
        <Field label={t('meet.photo')} hint={t('meet.photoHint')}><Camera photos={photos} onChange={setPhotos} max={2} /></Field>
        <Field label={t('meet.name')}><input value={f.name} onChange={set('name')} autoComplete="off" /></Field>
        <div className="grid2">
          <Field label={t('meet.org')}><input value={f.org} onChange={set('org')} /></Field>
          <Field label={t('meet.role')}><input value={f.role} onChange={set('role')} /></Field>
          <Field label={t('meet.email')}><input type="email" inputMode="email" value={f.email} onChange={set('email')} /></Field>
          <Field label={t('meet.phone')}><input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label={t('meet.event')}><input value={f.event} onChange={set('event')} placeholder={t('meet.eventPh')} /></Field>
        <fieldset className="trem-form">
          <legend>{t('meet.topics')}</legend>
          <div className="chip-toggles">
            {TOPICS.map((k) => (
              <label key={k} className={`chip-toggle ${f.topics.includes(k) ? 'on' : ''}`}>
                <input type="checkbox" checked={f.topics.includes(k)} onChange={() => setF({ ...f, topics: f.topics.includes(k) ? f.topics.filter((x) => x !== k) : [...f.topics, k] })} />
                {t(`meet.topic.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('visit.notes')}><textarea rows={4} value={f.notes} onChange={set('notes')} /></Field>
        <button type="button" className={`btn ${listening ? 'btn-primary' : ''}`} onClick={dictate}>{listening ? t('visit.dictating') : t('visit.dictate')}</button>
        <div className="grid2">
          <Field label={t('meet.followUp')}><input value={f.followUp} onChange={set('followUp')} placeholder={t('meet.followUpPh')} /></Field>
          <Field label={t('meet.due')}><input type="date" value={f.due} onChange={set('due')} /></Field>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <div className="card-actions"><button type="button" className="btn btn-primary" onClick={save} disabled={busy || !f.name.trim()}>{busy ? t('common.saving') : t('common.save')}</button></div>
      </Card>
      {list.length > 0 && (
        <Card title={t('meet.list', { n: list.length })} actions={<button type="button" className="btn" onClick={csv}>{t('meet.csv')}</button>}>
          <ul className="list">
            {list.map((r) => (
              <li key={r.id} className="list-item">
                <strong>{r.data.name}{r.data.org ? ` · ${r.data.org}` : ''}</strong>
                <span>{date(r.createdAt)}{r.data.event ? ` · ${r.data.event}` : ''}{r.data.topics.length ? ` · ${topicText(r.data)}` : ''}</span>
                {r.data.followUp && <span>→ {r.data.followUp}{r.data.due ? ` (${r.data.due})` : ''}</span>}
                <div className="row">
                  {r.data.email && <button type="button" className="btn" onClick={() => mail(r)}>{t('meet.mail')}</button>}
                  <button type="button" className="btn" onClick={() => vcard(r)}>{t('meet.vcard')}</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
