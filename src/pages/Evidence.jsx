import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n/i18n.jsx';
import { db, setSetting } from '../lib/db.js';
import { verifyAll, exportBundle } from '../lib/evidence.js';
import { Card, Notice, PageHeader, TrustBadge, downloadBlob } from '../components/ui.jsx';

export default function Evidence() {
  const { t, date } = useI18n();
  const records = useLiveQuery(() => db.records.orderBy('seq').reverse().toArray(), [], []);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => { setBusy(true); try { setCheck(await verifyAll()); } finally { setBusy(false); } };
  const bundle = async () => {
    const b = await exportBundle();
    downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `Pruefpaket_${b.device.keyId}_${b.exportedAt.slice(0, 10)}.json`);
    await setSetting('lastBackup', b.exportedAt);
  };

  return (
    <div className="page">
      <PageHeader title={t('ev.title')} />
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy || !records.length}>{busy ? t('ev.verifying') : t('ev.verify')}</button>
        <button type="button" className="btn" onClick={bundle} disabled={!records.length}>{t('ev.bundle')}</button>
      </div>
      <p className="muted">{t('ev.bundleHint')}</p>
      {check && (check.chain.ok
        ? <Notice kind="ok">{t('ev.chainOk', { n: check.count })}</Notice>
        : <Notice kind="error">{t('ev.chainBroken', { n: check.chain.breaks.length })}</Notice>)}
      {records.length === 0 ? <p className="muted">{t('ev.empty')}</p> : (
        <ul className="list">
          {records.map((r) => {
            const res = check?.results.get(r.id);
            return (
              <li key={r.id} className="list-item">
                <div className="row-between">
                  <strong>{t(`ev.kind.${r.kind}`)}{r.data?.name ? ` · ${r.data.name}` : r.data?.place ? ` · ${r.data.place}` : ''}</strong>
                  <TrustBadge level={res?.level} />
                </div>
                <span>{date(r.createdAt)} · #{r.seq} · {t('ev.hash')} {r.hash.slice(0, 12)}…</span>
                {res && [...res.problems.map((p) => t(`ev.problem.${p}`)), ...res.warnings.map((w) => t(`ev.warn.${w}`))].length > 0 && (
                  <span className="warn-text">{[...res.problems.map((p) => t(`ev.problem.${p}`)), ...res.warnings.map((w) => t(`ev.warn.${w}`))].join(' · ')}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
