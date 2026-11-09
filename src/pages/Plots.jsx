import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { usePlots } from '../components/PlotSelect.jsx';
import { PageHeader } from '../components/ui.jsx';

export default function Plots() {
  const { t, num } = useI18n();
  const plots = usePlots();
  return (
    <div className="page">
      <PageHeader title={t('plots.title')} />
      <Link className="btn btn-primary" to="/erfassen/flaeche">{t('plots.new')}</Link>
      {plots.length === 0 ? <p className="muted">{t('plots.empty')}</p> : (
        <ul className="list">
          {plots.map((p) => (
            <li key={p.id}><Link className="list-item" to={`/flaechen/${p.data.plotKey}`}>
              <strong>{p.data.name}</strong><span>{num(p.data.areaHa, 2)} ha · {t('plot.points', { n: p.data.points.length })}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
