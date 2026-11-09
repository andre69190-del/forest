import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from '../lib/db.js';
import { loadDemoForest } from '../lib/demo.js';
import InstallHint from '../components/InstallHint.jsx';
import { latestOnly } from '../lib/evidence.js';
import { isHabitatTree } from '../lib/forestry.js';
import { useI18n } from '../i18n/i18n.jsx';
import { Card, Notice } from '../components/ui.jsx';
import { useOnline } from '../App.jsx';

export default function Home() {
  const { t } = useI18n();
  const online = useOnline();
  const nav = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);
  const lastBackup = useLiveQuery(() => getSetting('lastBackup', null), [], null);
  const stats = useLiveQuery(async () => {
    const all = latestOnly(await db.records.toArray());
    return {
      plots: all.filter((r) => r.kind === 'plot').length,
      trees: all.filter((r) => r.kind === 'habitat_tree' && isHabitatTree(r.data)).length,
      records: all.length,
      visits: all.filter((r) => r.kind === 'visit').length,
    };
  }, [], { plots: 0, trees: 0, records: 0, visits: 0 });
  return (
    <div className="page">
      <header className="hero">
        <h1>{t('home.hello')}</h1>
        <p>{t('home.intro')}</p>
      </header>
      {!online && <Notice kind="warn">{t('home.offline')}</Notice>}
      {stats.records > 0 && (!lastBackup || Date.now() - Date.parse(lastBackup) > 7 * 864e5) && (
        <Notice kind="warn">{t('home.backup')} <Link to="/nachweise">{t('home.backupLink')}</Link></Notice>
      )}
      <div className="stats">
        {['plots', 'trees', 'records', 'visits'].map((k) => (
          <div key={k} className="stat"><strong>{stats[k]}</strong><span>{t(`home.stats.${k}`)}</span></div>
        ))}
      </div>
      <Card title={t('home.quick')}>
        <div className="tiles">
          <Link className="tile" to="/erfassen/flaeche">{t('capture.plot')}</Link>
          <Link className="tile" to="/erfassen/baum">{t('capture.tree')}</Link>
          <Link className="tile" to="/erfassen/totholz">{t('capture.deadwood')}</Link>
          <Link className="tile" to="/erfassen/besuch">{t('capture.visit')}</Link>
        </div>
      </Card>
      {stats.records === 0 && (
        <Card title={t('home.demo.title')}>
          <p>{t('home.demo.text')}</p>
          <button type="button" className="btn" disabled={demoBusy} onClick={async () => { setDemoBusy(true); const k = await loadDemoForest(); nav(`/flaechen/${k}`); }}>
            {demoBusy ? t('common.saving') : t('home.demo.button')}
          </button>
        </Card>
      )}
      <Link className="list-item" to="/info"><strong>{t('home.info')}</strong><span>{t('home.infoDesc')}</span></Link>
      <InstallHint />
      <Notice>{t('home.trustNote')}</Notice>
    </div>
  );
}
