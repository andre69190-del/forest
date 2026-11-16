/**
 * Interne Prüfung (#/gruppe/pruefung?p=<teilnehmer>&s=<stichprobe>): Checkliste PEFC D 1002-1:2020.
 * "Nicht erfüllt" öffnet sofort Feststellung, Schwere, Korrekturmaßnahme und Frist → eigene Abweichungs-Nachweise.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import { createEvidence } from '../lib/evidence.js';
import { ANSWERS, CHECKLISTS, DEFAULT_DUE_DAYS, SEVERITIES, addDays, checklistForProfile, inspectionSummary, itemKey, sectionKey } from '../lib/group.js';
import PositionPicker from '../components/PositionPicker.jsx';
import Camera from '../components/Camera.jsx';
import { Card, Field, Notice, PageHeader } from '../components/ui.jsx';
import { useGroupRecords } from './Group.jsx';

export default function Inspection() {
  const { t } = useI18n();
  const settings = useSettings();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const recs = useGroupRecords();
  const [pid, setPid] = useState(params.get('p') || '');
  const [inspector, setInspector] = useState(settings.inspectorName || settings.producerName || '');
  const [CL, setCL] = useState(() => (CHECKLISTS[settings.lastChecklist] ? settings.lastChecklist : checklistForProfile(settings.profile)));
  const [mode, setMode] = useState('field');
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [devs, setDevs] = useState({});
  const [pos, setPos] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const today = new Date().toISOString().slice(0, 10);

  const cl = CHECKLISTS[CL];
  const sections = useMemo(() => cl.sections
    .map((s) => ({ ...s, items: mode === 'field' ? s.items.filter((i) => cl.field.includes(i)) : s.items }))
    .filter((s) => s.items.length), [mode, cl]);
  const switchChecklist = (id) => { setCL(id); settings.update('lastChecklist', id); setAnswers({}); setNotes({}); setDevs({}); };
  const visible = sections.flatMap((s) => s.items);
  if (!recs) return <p className="muted">…</p>;
  const participants = recs.filter((r) => r.kind === 'participant');
  const sampleId = params.get('s');

  const answer = (item, a) => {
    setAnswers({ ...answers, [item]: a });
    if (a === 'nc' && !devs[item]) setDevs({ ...devs, [item]: { severity: 'minor', finding: '', action: '', due: addDays(today, DEFAULT_DUE_DAYS.minor) } });
  };
  const setDev = (item, k, v) => {
    const d = { ...devs[item], [k]: v };
    if (k === 'severity') d.due = addDays(today, DEFAULT_DUE_DAYS[v]);
    setDevs({ ...devs, [item]: d });
  };
  const allOk = () => {
    const next = { ...answers };
    for (const i of visible) if (!next[i]) next[i] = 'ok';
    setAnswers(next);
  };
  const shown = Object.fromEntries(visible.filter((i) => answers[i]).map((i) => [i, answers[i]]));
  const sum = inspectionSummary(CL, shown);
  const open = visible.length - Object.keys(shown).length;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (inspector.trim()) settings.update('inspectorName', inspector.trim());
      const nc = Object.keys(shown).filter((i) => shown[i] === 'nc');
      const insp = await createEvidence('inspection', {
        participantId: pid, checklist: CL, scope: mode, items: visible, answers: shown,
        notes: Object.fromEntries(Object.entries(notes).filter(([i, v]) => v.trim() && visible.includes(i))),
        inspector: inspector.trim(), sampleId: sampleId || null,
      }, { position: pos, photos });
      for (const item of nc) {
        const d = devs[item];
        await createEvidence('deviation', { inspectionId: insp.id, participantId: pid, checklist: CL, item, severity: d.severity, finding: d.finding.trim(), action: d.action.trim(), due: d.due }, { position: pos });
      }
      setMsg({ kind: 'ok', text: t('grp.insp.saved', { n: nc.length }) });
      setTimeout(() => nav('/gruppe'), 900);
    } catch (e) { setMsg({ kind: 'error', text: t('common.error', { msg: e.message }) }); setBusy(false); }
  };

  return (
    <div className="page">
      <PageHeader title={t('grp.insp.title')} back />
      {participants.length === 0 ? (
        <Notice kind="warn">{t('grp.noParticipants')} <Link to="/gruppe">{t('grp.title')}</Link></Notice>
      ) : (
        <>
          <Card>
            <Field label={t('grp.insp.participant')}>
              <select value={pid} onChange={(e) => setPid(e.target.value)}>
                <option value="">–</option>
                {participants.map((p) => <option key={p.id} value={p.id}>{p.data.name}</option>)}
              </select>
            </Field>
            {sampleId && <span className="badge badge-B">{t('grp.insp.inSample')}</span>}
            <Field label={t('grp.insp.inspector')}><input value={inspector} onChange={(e) => setInspector(e.target.value)} autoComplete="name" /></Field>
            <Field label={t('grp.insp.checklist')}>
              <select value={CL} onChange={(e) => switchChecklist(e.target.value)}>
                {Object.values(CHECKLISTS).map((c) => <option key={c.id} value={c.id}>{t(`grp.cl.${c.id}`)}</option>)}
              </select>
            </Field>
            {cl.benchmark && <Notice kind="info">{t('grp.cl.benchmarkNote')}</Notice>}
            <Field label={t('grp.insp.mode')} hint={t('grp.insp.mode.hint')}>
              <div className="segmented" role="group" aria-label={t('grp.insp.mode')}>
                <button type="button" className={mode === 'field' ? 'on' : ''} aria-pressed={mode === 'field'} onClick={() => setMode('field')}>{t('grp.insp.mode.field', { n: cl.field.length })}</button>
                <button type="button" className={mode === 'all' ? 'on' : ''} aria-pressed={mode === 'all'} onClick={() => setMode('all')}>{t('grp.insp.mode.all', { n: cl.sections.flatMap((s) => s.items).length })}</button>
              </div>
            </Field>
            <p className="field-hint">{t('grp.insp.source')} <a href={cl.source} target="_blank" rel="noopener noreferrer">{t(cl.benchmark ? 'grp.insp.sourceLinkInt' : 'grp.insp.sourceLink')}</a></p>
          </Card>

          {sections.map((s) => (
            <Card key={s.key} title={t(sectionKey(CL, s.key))}>
              {s.items.map((item) => (
                <div key={item} className="chk-item" data-item={item}>
                  <p className="chk-text"><strong>{item}</strong> {t(itemKey(CL, item))}</p>
                  <div className="segmented" role="group" aria-label={item}>
                    {ANSWERS.map((a) => (
                      <button key={a} type="button" className={`${answers[item] === a ? 'on' : ''} ans-${a}`} aria-pressed={answers[item] === a} onClick={() => answer(item, a)}>{t(`grp.ans.${a}`)}</button>
                    ))}
                  </div>
                  {answers[item] === 'nc' && devs[item] && (
                    <div className="chk-dev">
                      <Field label={t('grp.dev.severity')}>
                        <div className="segmented" role="group" aria-label={t('grp.dev.severity')}>
                          {SEVERITIES.map((v) => <button key={v} type="button" className={devs[item].severity === v ? 'on' : ''} aria-pressed={devs[item].severity === v} onClick={() => setDev(item, 'severity', v)}>{t(`grp.sev.${v}`)}</button>)}
                        </div>
                      </Field>
                      <Field label={t('grp.dev.finding')}><textarea rows={2} value={devs[item].finding} placeholder={t('grp.dev.findingPh')} onChange={(e) => setDev(item, 'finding', e.target.value)} /></Field>
                      <Field label={t('grp.dev.action')}><textarea rows={2} value={devs[item].action} placeholder={t('grp.dev.actionPh')} onChange={(e) => setDev(item, 'action', e.target.value)} /></Field>
                      <Field label={t('grp.dev.due')} hint={t('grp.dev.dueHint')}><input type="date" value={devs[item].due} onChange={(e) => setDev(item, 'due', e.target.value)} /></Field>
                    </div>
                  )}
                  {answers[item] && answers[item] !== 'nc' && (
                    <input className="chk-note" value={notes[item] || ''} placeholder={t('grp.insp.note')} aria-label={`${t('grp.insp.note')} ${item}`} onChange={(e) => setNotes({ ...notes, [item]: e.target.value })} />
                  )}
                </div>
              ))}
            </Card>
          ))}

          <Card>
            <p className="big">{t('grp.insp.summary', { ok: sum.ok, nc: sum.nc, na: sum.na, open })}</p>
            {open > 0 && <button type="button" className="btn btn-quiet" onClick={allOk}>{t('grp.insp.allOk')}</button>}
            <Field label={t('pos.title')}><PositionPicker value={pos} onChange={setPos} /></Field>
            <Field label={t('cam.title')}><Camera photos={photos} onChange={setPhotos} max={8} /></Field>
            {open > 0 && <Notice kind="warn">{t('grp.insp.incomplete', { n: open })}</Notice>}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <div className="card-actions">
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !pid || Object.keys(shown).length === 0}>{busy ? t('common.saving') : t('common.save')}</button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
