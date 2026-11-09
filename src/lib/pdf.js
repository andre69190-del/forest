/**
 * BIOGLOW Forest – PDF-Berichte (jsPDF, lazy geladen): Flächen-Pass und Fallbeispiel Feldbesuch.
 * Jeder Bericht trägt die Fingerabdrücke (Hashes) der enthaltenen Nachweise → prüfbar über das Prüf-Paket.
 */
import { APP_VERSION } from './evidence.js';

async function newDoc() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

function header(doc, title, subtitle) {
  doc.setFillColor(47, 125, 74);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.text(title, 14, 14);
  doc.setFontSize(9); doc.text('BIOGLOW Forest', 196, 14, { align: 'right' });
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13); doc.text(subtitle, 14, 32);
}

function lines(doc, y, rows) {
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont(undefined, 'bold'); doc.text(String(k), 14, y);
    doc.setFont(undefined, 'normal');
    const wrapped = doc.splitTextToSize(String(v ?? '–'), 130);
    doc.text(wrapped, 64, y);
    y += 6 * wrapped.length;
  }
  return y;
}

function footer(doc, t, records) {
  let y = 250;
  doc.setDrawColor(200); doc.line(14, y - 6, 196, y - 6);
  doc.setFontSize(8); doc.setTextColor(90, 90, 90);
  doc.text(t('pdf.generated', { d: new Date().toLocaleString(), v: APP_VERSION }), 14, y);
  doc.text(t('pdf.verifyHint'), 14, y + 4);
  y += 10;
  for (const r of records.slice(0, 8)) { doc.text(`${r.kind} · ${r.createdAt.slice(0, 16)} · ${r.hash.slice(0, 32)}…`, 14, y); y += 4; }
  doc.text(t('about.text1'), 14, 290, { maxWidth: 182 });
}

async function addPhoto(doc, mediaRow, x, y, w) {
  if (!mediaRow) return y;
  const url = URL.createObjectURL(new Blob([mediaRow.bytes], { type: mediaRow.type }));
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
  if (!img) return y;
  const h = (w * img.height) / img.width;
  doc.addImage(img, 'JPEG', x, y, w, Math.min(h, 90));
  URL.revokeObjectURL(url);
  return y + Math.min(h, 90) + 4;
}

export async function plotPassPdf({ t, plot, stats, trees, records, photoRow }) {
  const doc = await newDoc();
  header(doc, t('pdf.pass.title'), plot.data.name);
  let y = lines(doc, 42, [
    [t('plot.area', { ha: '' }).replace(':', '').trim(), `${stats.areaHa.toFixed(2)} ha`],
    [t('plot.perimeter', { m: '' }).replace(':', '').trim(), `${Math.round(stats.perimeterM)} m`],
    [t('plot.detail.trees'), `${trees.length} (${stats.perHa.toFixed(1)} / ha)`],
    [t('plot.detail.deadwood'), stats.deadwood != null ? `${stats.deadwood.toFixed(1)} m³/ha` : '–'],
    [t('set.profile'), stats.profileLabel],
    [t('pdf.coords'), plot.data.points.map((p) => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).join(' | ')],
  ]);
  y = await addPhoto(doc, photoRow, 14, y + 4, 90);
  footer(doc, t, records);
  return doc.output('blob');
}

export async function visitPdf({ t, visit, photoRows }) {
  const doc = await newDoc();
  const d = visit.data;
  header(doc, t('pdf.case.title'), d.place || '–');
  let y = lines(doc, 42, [
    [t('visit.country'), d.country], [t('visit.forestType'), d.forestType], [t('visit.people'), d.people],
    [t('pos.title'), visit.position ? `${visit.position.lat.toFixed(5)}, ${visit.position.lng.toFixed(5)} (±${visit.position.accuracy} m)` : '–'],
    [t('visit.notes'), d.notes],
  ]);
  let x = 14;
  for (const row of photoRows.slice(0, 4)) {
    await addPhoto(doc, row, x, Math.min(y + 4, 150), 88);
    x = x === 14 ? 108 : 14;
  }
  footer(doc, t, [visit]);
  return doc.output('blob');
}
