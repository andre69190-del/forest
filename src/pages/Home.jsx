import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from '../lib/db.js';
import { latestOnly } from '../lib/evidence.js';
import { isHabitatTree } from '../lib/forestry.js';
import { loadDemoForest } from '../lib/demo.js';
import { useI18n } from '../i18n/i18n.jsx';
import { Card, Notice } from '../components/ui.jsx';
import InstallHint from '../components/InstallHint.jsx';
import { useOnline } from '../App.jsx';

const KIND_PATH = { plot: (r) => `/flaechen/${r.data.plotKey}` };

export default function Home() {
  const { t, date } = useI18n();
  const online = useOnline();
  const nav = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);
  const lastBackup = useLiveQuery(() => getSetting('lastBackup', null), [], null);
  const data = useLiveQuery(async () => {
    const all = latestOnly(await db.records.toArray());
    return {
      plots: all.filter((r) => r.kind === 'plot').length,
      trees: all.filter((r) => r.kind === 'habitat_tree' && isHabitatTree(r.data)).length,
      records: all.length,
      visits: all.filter((r) => r.kind === 'visit').length,
      recent: all.sort((a, b) => b.seq - a.seq).slice(0, 3),
    };
  }, [], { plots: 0, trees: 0, records: 0, visits: 0, recent: [] });
  const needsBackup = data.records > 0 && (!lastBackup || Date.now() - Date.parse(lastBackup) > 7 * 864e5);

  return (
    <div className="page">
      <header className="hero">
        <h1>{t('home.hello')}</h1>
        <p>{t('home.intro')}</p>
      </header>
      {!online && <Notice kind="warn">{t('home.offline')}</Notice>}
      {needsBackup && <Notice kind="warn">{t('home.backup')} <Link to="/nachweise">{t('home.backupLink')}</Link></Notice>}

      <div className="tiles">
        <Link className="tile" to="/erfassen/flaeche">{t('capture.plot')}</Link>
        <Link className="tile" to="/erfassen/baum">{t('capture.tree')}</Link>
        <Link className="tile" to="/erfassen/totholz">{t('capture.deadwood')}</Link>
        <Link className="tile" to="/erfassen/besuch">{t('capture.visit')}</Link>
      </div>

      {data.records > 0 ? (
        <>
          <div className="stats">
            {['plots', 'trees', 'records', 'visits'].map((k) => (
              <div key={k} className="stat"><strong>{data[k]}</strong><span>{t(`home.stats.${k}`)}</span></div>
            ))}
          </div>
          <Card title={t('home.recent')}>
            <ul className="list">
              {data.recent.map((r) => {
                const label = `${t(`ev.kind.${r.kind}`)}${r.data?.name ? ` · ${r.data.name}` : r.data?.place ? ` · ${r.data.place}` : r.data?.species ? ` · ${r.data.species}` : ''}`;
                const to = KIND_PATH[r.kind] ? KIND_PATH[r.kind](r) : r.plotId ? `/flaechen/${r.plotId}` : '/nachweise';
                return <li key={r.id}><Link className="list-item" to={to}><strong>{label}</strong><span>{date(r.createdAt)}</span></Link></li>;
              })}
            </ul>
          </Card>
        </>
      ) : (
        <Card title={t('home.demo.title')}>
          <p>{t('home.demo.text')}</p>
          <button type="button" className="btn" disabled={demoBusy} onClick={async () => { setDemoBusy(true); nav(`/flaechen/${await loadDemoForest()}`); }}>
            {demoBusy ? t('common.saving') : t('home.demo.button')}
          </button>
        </Card>
      )}

      <InstallHint compact />
      <p className="footer-links">
        <Link to="/info">{t('home.info')}</Link> · <Link to="/geplant">{t('plan.title')}</Link>
      </p>
    </div>
  );
}
