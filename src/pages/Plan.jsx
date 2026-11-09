/** „Was geplant ist" – Roadmap für Nutzer (Stand = APP_VERSION). Status: done | next | later */
import { useI18n } from '../i18n/i18n.jsx';
import { APP_VERSION } from '../lib/evidence.js';
import { Card, PageHeader } from '../components/ui.jsx';

const PHASES = [
  { key: '1a', status: 'done', items: ['plot', 'tree', 'deadwood', 'visit', 'trust', 'audit', 'lang'] },
  { key: '1b', status: 'next', items: ['trems47', 'species', 'monitoring', 'qr', 'sync', 'backup'] },
  { key: '1c', status: 'later', items: ['native', 'attest', 'timestamp', 'store'] },
  { key: '2', status: 'later', items: ['roles', 'checklists', 'sampling', 'auditfolder', 'lang1'] },
  { key: '3', status: 'later', items: ['satellite', 'inventory', 'soil', 'tropics', 'lang2'] },
  { key: '4', status: 'later', items: ['citizen', 'dashboard', 'gbif', 'lang3'] },
];

export default function Plan() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHeader title={t('plan.title')} back />
      <p className="lead">{t('plan.lead', { v: APP_VERSION })}</p>
      {PHASES.map((ph) => (
        <Card key={ph.key} title={`${t('plan.phase')} ${ph.key} · ${t(`plan.p${ph.key}.title`)}`}>
          <span className={`badge badge-${ph.status === 'done' ? 'A' : ph.status === 'next' ? 'B' : 'unknown'}`}>{t(`plan.status.${ph.status}`)}</span>
          <ul className="bullets">{ph.items.map((i) => <li key={i}>{t(`plan.p${ph.key}.${i}`)}</li>)}</ul>
        </Card>
      ))}
      <p className="muted">{t('plan.feedback')}</p>
    </div>
  );
}
