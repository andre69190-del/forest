/**
 * Gruppenzertifizierung (#/gruppe): Teilnehmer · Stichprobe · Abweichungen · Prüfungen · Gruppenbericht.
 * Alles sind signierte Nachweise – die Gruppe kann nichts still nachträglich ändern.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n/i18n.jsx';
import { db } from '../lib/db.js';
import { createEvidence, latestOnly } from '../lib/evidence.js';
import { RISKS, deviationStatus, drawSample, effectiveRisk, groupSummary, verifySample } from '../lib/group.js';
import { loadDemoGroup } from '../lib/demo.js';
import Camera from '../components/Camera.jsx';
import { Card, Field, Notice, PageHeader, downloadBlob } from '../components/ui.jsx';

export const GROUP_KINDS = ['participant', 'sample', 'inspection', 'deviation', 'deviation_closed'];
const RISK_BADGE = { low: 'A', normal: 'B', high: 'C' };
const STATE_BADGE = { closed: 'A', open: 'B', overdue: 'C' };

export function useGroupRecords() {
  return useLiveQuery(async () => latestOnly(await db.records.where('kind').anyOf(GROUP_KINDS).toArray())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [], null);
}

function ParticipantForm({ onDone }) {
  const { t } = useI18n();
  const [f, setF] = useState({ name: '', areaHa: '', region: '', risk: 'normal', contact: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    await createEvidence('participant', { ...f, name: f.name.trim(), areaHa: f.areaHa === '' ? null : Number(f.areaHa) });
    setBusy(false); onDone();
  };
  return (
    <div className="page" style={{ gap: 10 }}>
      <Field label={t('grp.p.name')}><input value={f.name} onChange={set('name')} /></Field>
      <div className="grid2">
        <Field label={t('grp.p.area')}><input type="number" inputMode="decimal" min="0" step="0.1" value={f.areaHa} onChange={set('areaHa')} /></Field>
        <Field label={t('grp.p.region')}><input value={f.region} onChange={set('region')} /></Field>
      </div>
      <Field label={t('grp.p.risk')} hint={t('grp.risk.hint')}>
        <div className="segmented" role="group" aria-label={t('grp.p.risk')}>
          {RISKS.map((r) => <button key={r} type="button" className={f.risk === r ? 'on' : ''} aria-pressed={f.risk === r} onClick={() => setF({ ...f, risk: r })}>{t(`grp.risk.${r}`)}</button>)}
        </div>
      </Field>
      <Field label={`${t('grp.p.contact')} (${t('common.optional')})`}><input value={f.contact} onChange={set('contact')} /></Field>
      <div className="card-actions">
        <button type="button" className="btn" onClick={onDone}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>{busy ? t('common.saving') : t('common.save')}</button>
      </div>
    </div>
  );
}

function CloseDeviation({ dev, onDone }) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    await createEvidence('deviation_closed', { deviationId: dev.id, participantId: dev.data.participantId, note }, { photos });
    setBusy(false); onDone();
  };
  return (
    <div className="page" style={{ gap: 10, marginTop: 8 }}>
      <Field label={t('grp.dev.closeNote')}><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label={t('cam.title')}><Camera photos={photos} onChange={setPhotos} max={4} /></Field>
      <div className="card-actions">
        <button type="button" className="btn" onClick={onDone}>{t('common.cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={busy || !note.trim()} onClick={save}>{busy ? t('common.saving') : t('grp.dev.closeSave')}</button>
      </div>
    </div>
  );
}

export default function Group() {
  const { t, num, date } = useI18n();
  const recs = useGroupRecords();
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState(null);
  const [factor, setFactor] = useState(1);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!recs) return <p className="muted">…</p>;

  const participants = recs.filter((r) => r.kind === 'participant');
  const byId = new Map(participants.map((p) => [p.id, p]));
  const pname = (id) => byId.get(id)?.data.name || '?';
  const devs = deviationStatus(recs);
  const openDevs = devs.filter((d) => d.state !== 'closed').map((d) => d.deviation);
  const s = groupSummary(recs);
  const samples = recs.filter((r) => r.kind === 'sample');
  const inspections = recs.filter((r) => r.kind === 'inspection').reverse();
  const last = s.lastSample;
  const sameDay = last ? samples.filter((x) => x.createdAt.slice(0, 10) === last.createdAt.slice(0, 10)).length : 0;

  const draw = async () => {
    setBusy(true); setMsg(null);
    const population = participants.map((p) => ({ id: p.id, risk: effectiveRisk(p, openDevs) }));
    const seed = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const d = drawSample(population, seed, factor);
    await createEvidence('sample', { seed, factor, rule: 'sqrt', size: d.size, selected: d.selected, population });
    setBusy(false);
  };
  const demo = async () => {
    setBusy(true);
    await loadDemoGroup();
    setMsg({ kind: 'ok', text: t('grp.demoLoaded') });
    setBusy(false);
  };
  const report = async () => {
    const { groupReportPdf } = await import('../lib/pdf.js');
    const blob = await groupReportPdf({ t, num, date, records: recs, summary: s, devs, pname });
    downloadBlob(blob, `Gruppenbericht_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="page">
      <PageHeader title={t('grp.title')} back />
      <p className="lead">{t('grp.lead')}</p>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="stats">
        <div className="stat"><strong>{s.participants}</strong><span>{t('grp.stats.participants')}</span></div>
        <div className="stat"><strong>{num(s.areaHa, 0)}</strong><span>{t('grp.stats.area')}</span></div>
        <div className="stat"><strong>{s.inspections}</strong><span>{t('grp.stats.inspections')}</span></div>
        <div className="stat"><strong>{s.open + s.overdue}</strong><span>{t('grp.stats.open')}</span></div>
      </div>

      <div className="tiles">
        <Link className="tile" to="/gruppe/pruefung">{t('grp.insp.new')}</Link>
        <button type="button" className="tile tile-quiet" onClick={report} disabled={!participants.length}>{t('grp.report')}</button>
      </div>

      {participants.length > 0 && (
        <Card title={t('grp.sample.title')}>
          <p className="muted">{t('grp.sample.lead')}</p>
          <Field label={t('grp.sample.factor')}>
            <select value={factor} onChange={(e) => setFactor(Number(e.target.value))}>
              <option value={1}>{t('grp.sample.f1')}</option>
              <option value={0.6}>{t('grp.sample.f06')}</option>
            </select>
          </Field>
          <div className="card-actions"><button type="button" className="btn btn-primary" onClick={draw} disabled={busy}>{t('grp.sample.draw')}</button></div>
          {last && (
            <div className="sample-result">
              <p className="big">{t('grp.sample.drawn', { d: date(last.createdAt), n: last.data.selected.length, total: last.data.population.length })}</p>
              <p className="muted">{t('grp.sample.progress', { done: s.sampleDone, n: s.sampleSize })} · {t('grp.sample.seed')} <code>{last.data.seed}</code>{sameDay > 1 ? ` · ${t('grp.sample.count', { n: sameDay })}` : ''}</p>
              <ul className="list">
                {last.data.selected.map((id) => {
                  const done = inspections.some((i) => i.data.participantId === id && i.createdAt >= last.createdAt);
                  return <li key={id}><Link className="list-item" to={`/gruppe/pruefung?p=${id}&s=${last.id}`}><strong>{done ? '✓ ' : ''}{pname(id)}</strong></Link></li>;
                })}
              </ul>
              {verifySample(last, last.data.population)
                ? <Notice kind="ok">{t('grp.sample.verifyOk')}</Notice>
                : <Notice kind="error">{t('grp.sample.verifyFail')}</Notice>}
              <p className="field-hint">{t('grp.sample.note')}</p>
            </div>
          )}
        </Card>
      )}

      {participants.length > 0 && (
      <Card title={`${t('grp.dev.title')} (${devs.length})`}>
        {devs.length === 0 ? <p className="muted">{t('grp.dev.none')}</p> : (
          <ul className="list">
            {devs.map(({ deviation: d, closed, state }) => (
              <li key={d.id} className="list-item">
                <span className="row-between">
                  <strong>{d.data.checklist === 'PEFC_INT_2024' ? 'ST 1003 ' : ''}{d.data.item} · {pname(d.data.participantId)}</strong>
                  <span className={`badge badge-${STATE_BADGE[state]}`}>{t(`grp.state.${state}`)}</span>
                </span>
                <span>{t(`grp.sev.${d.data.severity}`)} · {closed ? t('grp.dev.closedOn', { d: date(closed.createdAt) }) : t('grp.dev.dueOn', { d: d.data.due || '–' })}</span>
                {d.data.finding && <span>{d.data.finding}</span>}
                {d.data.action && <span>→ {d.data.action}</span>}
                {!closed && (closing === d.id
                  ? <CloseDeviation dev={d} onDone={() => setClosing(null)} />
                  : <div className="card-actions"><button type="button" className="btn" onClick={() => setClosing(d.id)}>{t('grp.dev.close')}</button></div>)}
              </li>
            ))}
          </ul>
        )}
      </Card>
      )}

      <Card title={`${t('grp.participants')} (${participants.length})`}>
        {participants.length === 0 && !adding && (
          <>
            <p className="muted">{t('grp.noParticipants')}</p>
            <button type="button" className="btn" onClick={demo} disabled={busy}>{t('grp.demo')}</button>
            <p className="field-hint">{t('grp.demoDesc')}</p>
          </>
        )}
        {participants.length > 0 && (
          <details open={participants.length <= 6 || adding}>
          <summary className="btn btn-quiet">{t('grp.participants.show', { n: participants.length })}</summary>
          <ul className="list">
            {participants.map((p) => {
              const risk = effectiveRisk(p, openDevs);
              const n = inspections.filter((i) => i.data.participantId === p.id).length;
              return (
                <li key={p.id}>
                  <Link className="list-item" to={`/gruppe/pruefung?p=${p.id}`}>
                    <span className="row-between"><strong>{p.data.name}</strong><span className={`badge badge-${RISK_BADGE[risk]}`}>{t(`grp.risk.${risk}`)}</span></span>
                    <span>{[p.data.areaHa != null ? `${num(p.data.areaHa, 1)} ha` : null, p.data.region, n ? `${n} × ${t('ev.kind.inspection')}` : null].filter(Boolean).join(' · ')}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          </details>
        )}
        {adding ? <ParticipantForm onDone={() => setAdding(false)} /> : (
          <div className="card-actions"><button type="button" className="btn" onClick={() => setAdding(true)}>{t('grp.addParticipant')}</button></div>
        )}
      </Card>

      <Card title={`${t('grp.insp.list')} (${inspections.length})`}>
        {inspections.length === 0 ? <p className="muted">{t('grp.insp.none')}</p> : (
          <ul className="list">
            {inspections.map((i) => {
              const a = Object.values(i.data.answers || {});
              return (
                <li key={i.id} className="list-item">
                  <strong>{pname(i.data.participantId)}</strong>
                  <span>{date(i.createdAt)} · {i.data.inspector || '–'} · {a.filter((x) => x === 'ok').length} {t('grp.ans.ok')} · {a.filter((x) => x === 'nc').length} {t('grp.ans.nc')}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
