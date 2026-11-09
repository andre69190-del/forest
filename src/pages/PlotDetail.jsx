import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { latestOnly, verifyAll, exportBundle, getDeviceKey } from '../lib/evidence.js';
import { treeUrl, qrDataUrl } from '../lib/qr.js';
import { toEudrGeoJSON, perimeterM } from '../lib/geo.js';
import { PROFILES, habitatTreeStatus, isHabitatTree, TREM_GROUPS } from '../lib/forestry.js';
import { plotPassPdf, qrLabelsPdf, auditFolderPdf } from '../lib/pdf.js';
import { useI18n } from '../i18n/i18n.jsx';
import { useSettings } from '../App.jsx';
import PlotMap from '../components/PlotMap.jsx';
import { Card, Notice, PageHeader, downloadBlob } from '../components/ui.jsx';

export default function PlotDetail() {
  const { key } = useParams();
  const { t, num } = useI18n();
  const [busy, setBusy] = useState(null);
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
  const trees = linked.filter((r) => r.kind === 'habitat_tree' && isHabitatTree(r.data)).sort((a, b) => a.seq - b.seq);
  const areaHa = plot.data.areaHa;
  const status = habitatTreeStatus(trees.map((r) => r.data), areaHa, profile);
  const lines = linked.filter((r) => r.kind === 'deadwood_line');
  const deadwood = lines.length ? lines.reduce((s, r) => s + r.data.volumeM3Ha, 0) / lines.length : null;
  const groupsFound = new Set(trees.flatMap((r) => r.data.trems || []));
  const typesFound = new Set(trees.flatMap((r) => r.data.tremTypes || []));
  const tremSummary = `${t('plot.detail.tremGroups', { n: groupsFound.size, of: TREM_GROUPS.length })}${typesFound.size ? ` · ${t('plot.detail.tremTypes', { n: typesFound.size })}` : ''}`;
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

  const exportQr = async () => {
    setBusy('qr');
    try {
      const blob = await qrLabelsPdf({ t, plotName: plot.data.name, trees, qrFor: (id) => qrDataUrl(treeUrl(id), 400) });
      downloadBlob(blob, `QR-Plaketten_${safeName}_${stamp}.pdf`);
    } finally { setBusy(null); }
  };
  const exportAudit = async () => {
    setBusy('audit');
    try {
      const check = await verifyAll();
      const key = await getDeviceKey();
      const records = [plot, ...linked].sort((a, b) => a.seq - b.seq);
      const blob = await auditFolderPdf({
        t, num, plot, records, trees, levels: check.results, keyId: key.keyId, chainOk: check.chain.ok, tremSummary,
        stats: { areaHa, perimeterM: perimeterM(plot.data.points), perHa: status.perHa, target: status.target, deadwood, profileLabel: t(`profile.${profile.key}`) },
      });
      downloadBlob(blob, `Auditor-Mappe_${safeName}_${stamp}.pdf`);
      const b = await exportBundle({ recordIds: records.map((r) => r.id) });
      downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `Pruefpaket_${safeName}_${stamp}.json`);
    } finally { setBusy(null); }
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
        <p className="muted">{tremSummary}</p>
        {status.status === 'none' ? <p className="muted">{t('plot.detail.noTarget')}</p> : (
          <Notice kind={status.status === 'ok' ? 'ok' : 'warn'}>{t('plot.detail.target', { n: status.target })}</Notice>
        )}
        {trees.length > 0 && (
          <ul className="list">
            {trees.map((r, i) => (
              <li key={r.id}><Link className="list-item" to={`/baum/${r.id}`}>
                <span className="row-between"><strong>#{i + 1} {r.data.species || t('ev.kind.habitat_tree')}</strong><span>{r.data.bhdCm ? `${r.data.bhdCm} cm` : ''}</span></span>
                <span>{(r.data.trems || []).map((g) => t(`trem.${g}`)).join(', ')}</span>
              </Link></li>
            ))}
          </ul>
        )}
        <div className="row">
          <Link className="btn" to={`/erfassen/baum?flaeche=${key}`}>{t('capture.tree')}</Link>
          {trees.length > 0 && <button type="button" className="btn" onClick={exportQr} disabled={!!busy}>{busy === 'qr' ? t('common.saving') : t('qr.labels')}</button>}
        </div>
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
        <button type="button" className="btn btn-primary" onClick={exportAudit} disabled={!!busy}>{busy === 'audit' ? t('common.saving') : t('audit.folder.button')}</button>
        <p className="muted">{t('audit.folder.hint')}</p>
        {err && <Notice kind="error">{err}</Notice>}
      </Card>
    </div>
  );
}
