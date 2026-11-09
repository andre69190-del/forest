import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { PageHeader } from '../components/ui.jsx';

const ITEMS = [['flaeche', 'plot'], ['baum', 'tree'], ['totholz', 'deadwood'], ['besuch', 'visit'], ['gespraech', 'meeting']];

export default function Capture() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHeader title={t('capture.title')} />
      <ul className="list">
        {ITEMS.map(([path, key]) => (
          <li key={key}><Link className="list-item" to={`/erfassen/${path}`}><strong>{t(`capture.${key}`)}</strong><span>{t(`capture.${key}.desc`)}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}
