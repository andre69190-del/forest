import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { latestOnly } from '../lib/evidence.js';
import { isHabitatTree } from '../lib/forestry.js';
import { useI18n } from '../i18n/i18n.jsx';
import { Card, Notice } from '../components/ui.jsx';
import { useOnline } from '../App.jsx';

export default function Home() {
  const { t } = useI18n();
  const online = useOnline();
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
      <Notice>{t('home.trustNote')}</Notice>
    </div>
  );
}
