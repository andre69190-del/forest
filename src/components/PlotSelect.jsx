import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { latestOnly } from '../lib/evidence.js';
import { useI18n } from '../i18n/i18n.jsx';

export function usePlots() {
  return useLiveQuery(async () => latestOnly(await db.records.where('kind').equals('plot').toArray())
    .sort((a, b) => a.data.name.localeCompare(b.data.name)), [], []);
}

export default function PlotSelect({ value, onChange }) {
  const { t } = useI18n();
  const plots = usePlots();
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{t('common.noPlot')}</option>
      {plots.map((p) => <option key={p.id} value={p.data.plotKey}>{p.data.name}</option>)}
    </select>
  );
}
