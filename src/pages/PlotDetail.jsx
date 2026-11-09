import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { latestOnly } from '../lib/evidence.js';
import { toEudrGeoJSON, perimeterM } from '../lib/geo.js';
import { PROFILES, habitatTreeStatus, isHabitatTree } from '../lib/forestry.js';
import { plotPassPdf } from '../lib/pdf.js';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import PlotMap from '../components/PlotMap.jsx';
import { Card, Notice, PageHeader, downloadBlob } from '../components/ui.jsx';

export default function PlotDetail() {
  const { key } = useParams();
  const { t, num } = useI18n();
  const settings = useSettings();
  const [polygon, setPolygon] = useState(false);
  const [err, setErr] = useState(null);
  const data = useLiveQuery(async () => {
    const all = latestOnly(await db.records.toArray());
    const plot = all.find((r) => r.kind === 'plot' && r.data.plotKey === key);
    const linked = all.filter((r) => r.plotId === key);
    return { plot, linked };
  }, [key]);
  if (!data) return null;
  const { plot, linked } = data;
  if (!plot) return <div className="page"><PageHeader title="?" back /></div>;

  const profile = PROFILES[settings.profile] || PROFILES.INT;
  const trees = linked.filter((r) => r.kind === 'habitat_tree' && isHabitatTree(r.data));
  const areaHa = plot.data.areaHa;
  const status = habitatTreeStatus(trees.map((r) => r.data), areaHa, profile);
  const lines = linked.filter((r) => r.kind === 'deadwood_line');
  const deadwood = lines.length ? lines.reduce((s, r) => s + r.data.volumeM3Ha, 0) / lines.length : null;
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = plot.data.name.replace(/[^\w-]+/g, '_');

  const exportGeoJson = () => {
    setErr(null);
    try {
      const gj = toEudrGeoJSON([{ name: plot.data.name, points: plot.data.points }],
        { name: settings.producerName || undefined, country: settings.producerCountry || plot.data.country || undefined }, { forcePolygon: polygon });
      downloadBlob(new Blob([JSON.stringify(gj, null, 2)], { type: 'application/geo+json' }), `EUDR_${safeName}_${stamp}.geojson`);
    } catch (e) { setErr(t('common.error', { msg: e.message })); }
  };
  const exportPdf = async () => {
    const firstPhoto = trees.flatMap((r) => r.media || [])[0];
    const photoRow = firstPhoto ? await db.media.get(firstPhoto.id) : null;
    const blob = await plotPassPdf({
      t, plot, trees, records: [plot, ...linked], photoRow,
      stats: { areaHa, perimeterM: perimeterM(plot.data.points), perHa: status.perHa, deadwood, profileLabel: t(`profile.${profile.key}`) },
    });
    downloadBlob(blob, `Flaechen-Pass_${safeName}_${stamp}.pdf`);
  };

  return (
    <div className="page">
      <PageHeader title={plot.data.name} back />
      <PlotMap polygon={plot.data.points} markers={linked.filter((r) => r.position).map((r) => r.position)} height={300} />
      <Card>
        <p><strong>{t('plot.area', { ha: num(areaHa, 2) })}</strong> · {t('plot.perimeter', { m: num(perimeterM(plot.data.points), 0) })}</p>
        <p>{areaHa > 4 ? t('plot.eudrPolygon') : t('plot.eudrPoint')}</p>
      </Card>
      <Card title={t('plot.detail.trees')}>
        <p className="big">{trees.length} · {t('plot.detail.perHa', { n: num(status.perHa, 1) })}</p>
        {status.status === 'none' ? <p className="muted">{t('plot.detail.noTarget')}</p> : (
          <Notice kind={status.status === 'ok' ? 'ok' : 'warn'}>{t('plot.detail.target', { n: status.target })}</Notice>
        )}
        <Link className="btn" to={`/erfassen/baum?flaeche=${key}`}>{t('capture.tree')}</Link>
      </Card>
      <Card title={t('plot.detail.deadwood')}>
        <p className="big">{deadwood != null ? t('dw.volume', { v: num(deadwood, 1) }) : '–'}</p>
        <Link className="btn" to={`/erfassen/totholz?flaeche=${key}`}>{t('capture.deadwood')}</Link>
      </Card>
      <Card title={t('common.export')}>
        <label className="check"><input type="checkbox" checked={polygon} onChange={(e) => setPolygon(e.target.checked)} /><span>{t('plot.export.polygon')}</span></label>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={exportGeoJson}>{t('plot.export.geojson')}</button>
          <button type="button" className="btn" onClick={exportPdf}>{t('plot.export.pass')}</button>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
      </Card>
    </div>
  );
}
