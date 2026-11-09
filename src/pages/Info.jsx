/** Ausführliche App-Beschreibung (für Waldbesitzer, Prüfer, Fachleute) – in jeder Sprache. */
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { Card, PageHeader } from '../components/ui.jsx';
import InstallHint from '../components/InstallHint.jsx';

// [Überschrift, Absätze, Aufzählung]
const SECTIONS = [
  ['info.what.title', ['info.what.p1', 'info.what.p2'], []],
  ['info.who.title', [], ['info.who.owner', 'info.who.group', 'info.who.auditor', 'info.who.visitor']],
  ['info.features.title', [], ['info.features.plot', 'info.features.tree', 'info.features.deadwood', 'info.features.visit',
    'info.features.trems47', 'info.features.monitoring', 'info.features.auditfolder', 'info.features.meeting',
    'info.features.evidence', 'info.features.audit', 'info.features.profiles', 'info.features.offline']],
  ['info.trust.title', ['info.trust.p1', 'info.trust.p2'], ['info.trust.a', 'info.trust.b', 'info.trust.c']],
  ['info.data.title', ['info.data.p1', 'info.data.p2'], []],
  ['info.limits.title', ['about.text1', 'about.text2', 'about.text3'], []],
  ['info.next.title', ['info.next.p1'], []],
];

export default function Info() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHeader title={t('info.title')} back />
      <p className="lead">{t('info.lead')}</p>
      {SECTIONS.map(([title, paras, bullets]) => (
        <Card key={title} title={t(title)}>
          {paras.map((k) => <p key={k}>{t(k)}</p>)}
          {bullets.length > 0 && <ul className="bullets">{bullets.map((k) => <li key={k}>{t(k)}</li>)}</ul>}
        </Card>
      ))}
      <Link className="list-item" to="/geplant"><strong>{t('plan.title')}</strong><span>{t('plan.short')}</span></Link>
      <InstallHint />
      <Link className="btn btn-primary" to="/erfassen">{t('info.start')}</Link>
    </div>
  );
}
