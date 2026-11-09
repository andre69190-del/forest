import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n/i18n.jsx';
import { db, setSetting } from '../lib/db.js';
import { verifyAll, exportBundle, tamperDemo } from '../lib/evidence.js';
import { Card, Notice, PageHeader, TrustBadge, downloadBlob } from '../components/ui.jsx';

function fmt(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 40 ? `${v.slice(0, 40)}…` : v;
  return JSON.stringify(v);
}

/** Manipulation ausprobieren: zeigt, dass eine nachträgliche Änderung sofort auffällt. */
function TamperDemo() {
  const { t } = useI18n();
  const [res, setRes] = useState(undefined);
  const run = async () => setRes(await tamperDemo());
  return (
    <Card title={t('tamper.title')}>
      <div id="manipulation" />
      <p>{t('tamper.text')}</p>
      <button type="button" className="btn btn-primary" onClick={run}>{t('tamper.button')}</button>
      {res === null && <Notice>{t('ev.empty')}</Notice>}
      {res && (
        <div className="tamper">
          <p>{t('tamper.changed', { kind: t(`ev.kind.${res.record.kind}`), field: t(`tamper.field.${res.field}`), before: fmt(res.before), after: fmt(res.after) })}</p>
          <div className="tamper-grid">
            <div className="tamper-col">
              <strong>{t('tamper.original')}</strong>
              <TrustBadge level={res.original.level} />
              <span>{res.original.problems.length ? res.original.problems.map((p) => t(`ev.problem.${p}`)).join(' · ') : t('tamper.ok')}</span>
            </div>
            <div className="tamper-col tamper-bad">
              <strong>{t('tamper.copy')}</strong>
              <TrustBadge level={res.tampered.level} />
              <span>{res.tampered.problems.map((p) => t(`ev.problem.${p}`)).join(' · ')}</span>
            </div>
          </div>
          <p className="muted">{t('tamper.note')}</p>
        </div>
      )}
    </Card>
  );
}

export default function Evidence() {
  const { t, date, num } = useI18n();
  const location = useLocation();
  const records = useLiveQuery(() => db.records.orderBy('seq').reverse().toArray(), [], []);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  // Beim Öffnen und nach jedem neuen Nachweis automatisch prüfen
  useEffect(() => { if (records.length) run(); }, [records.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.hash === '#manipulation') setTimeout(() => document.getElementById('manipulation')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [location.hash]);

  const run = async () => { setBusy(true); try { setCheck(await verifyAll()); } finally { setBusy(false); } };
  const bundle = async () => {
    const b = await exportBundle();
    downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `Pruefpaket_${b.device.keyId}_${b.exportedAt.slice(0, 10)}.json`);
    await setSetting('lastBackup', b.exportedAt);
  };

  return (
    <div className="page">
      <PageHeader title={t('ev.title')} />
      <p className="muted">{t('home.trustNote')}</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !records.length}>{busy ? t('ev.verifying') : t('ev.verify')}</button>
        <button type="button" className="btn" onClick={bundle} disabled={!records.length}>{t('ev.bundle')}</button>
      </div>
      <p className="muted">{t('ev.bundleHint')}</p>
      {check && (check.chain.ok
        ? <Notice kind="ok">{t('ev.chainOk', { n: check.count })}</Notice>
        : <Notice kind="error">{t('ev.chainBroken', { n: check.chain.breaks.length })}</Notice>)}
      {records.length > 0 && <TamperDemo />}
      {records.length === 0 ? <p className="muted">{t('ev.empty')}</p> : (
        <ul className="list">
          {records.map((r) => {
            const res = check?.results.get(r.id);
            const notes = res ? [...res.problems.map((p) => t(`ev.problem.${p}`)), ...res.warnings.map((w) => t(`ev.warn.${w}`))] : [];
            const isOpen = open === r.id;
            return (
              <li key={r.id}>
                <button type="button" className="list-item list-button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                  <span className="row-between">
                    <strong>{t(`ev.kind.${r.kind}`)}{r.data?.name ? ` · ${r.data.name}` : r.data?.place ? ` · ${r.data.place}` : r.data?.species ? ` · ${r.data.species}` : ''}</strong>
                    <TrustBadge level={res?.level} />
                  </span>
                  <span>{date(r.createdAt)} · #{r.seq}</span>
                  {notes.length > 0 && <span className="warn-text">{notes.join(' · ')}</span>}
                </button>
                {isOpen && (
                  <dl className="details">
                    {r.position && <><dt>{t('pos.title')}</dt><dd>{r.position.lat.toFixed(6)}, {r.position.lng.toFixed(6)}{r.position.accuracy ? ` (± ${num(r.position.accuracy, 0)} m)` : ''}</dd></>}
                    <dt>{t('cam.title')}</dt><dd>{(r.media || []).length ? (r.media || []).map((m) => (m.source === 'camera' ? t('ev.fromCamera') : t('cam.fromFile'))).join(', ') : t('common.none')}</dd>
                    <dt>{t('ev.hash')}</dt><dd><code className="hash">{r.hash}</code></dd>
                    <dt>{t('ev.prev')}</dt><dd><code className="hash">{r.prevHash.slice(0, 24)}…</code></dd>
                    <dt>{t('ev.device')}</dt><dd><code>{r.deviceKeyId}</code> · {r.platform} · v{r.appVersion}</dd>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
