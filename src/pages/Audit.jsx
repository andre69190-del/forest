import { useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { verifyBundle } from '../lib/evidence.js';
import { Card, Notice, PageHeader, TrustBadge } from '../components/ui.jsx';

/** Auditor-Ansicht: fremdes Prüf-Paket laden und vollständig im Browser nachrechnen. */
export default function Audit() {
  const { t, date } = useI18n();
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const load = async (e) => {
    setErr(null); setRes(null);
    const f = e.target.files?.[0];
    if (!f) return;
    try { setRes(await verifyBundle(JSON.parse(await f.text()))); } catch { setErr(t('audit.badFile')); }
  };
  const ok = res ? res.results.filter((r) => !r.problems.length).length : 0;
  return (
    <div className="page">
      <PageHeader title={t('audit.title')} back />
      <Card>
        <p>{t('audit.intro')}</p>
        <label className="btn btn-primary">{t('audit.load')}<input type="file" accept="application/json,.json" hidden onChange={load} /></label>
        {err && <Notice kind="error">{err}</Notice>}
        {res && <Notice kind={ok === res.results.length && res.chainOk ? 'ok' : 'error'}>{t('audit.result', { ok, n: res.results.length })}</Notice>}
      </Card>
      {res && (
        <ul className="list">
          {res.results.map((r) => (
            <li key={r.id} className="list-item">
              <div className="row-between"><strong>{t(`ev.kind.${r.kind}`)}</strong><TrustBadge level={r.level} /></div>
              <span>{date(r.createdAt)}</span>
              {r.problems.length > 0 && <span className="warn-text">{r.problems.map((p) => t(`ev.problem.${p}`)).join(' · ')}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
