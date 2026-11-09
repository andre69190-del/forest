/**
 * BIOGLOW Forest – PDF-Berichte (jsPDF, lazy geladen): Flächen-Pass und Fallbeispiel Feldbesuch.
 * Jeder Bericht trägt die Fingerabdrücke (Hashes) der enthaltenen Nachweise → prüfbar über das Prüf-Paket.
 */
import { APP_VERSION } from './evidence.js';

// Die Standardschrift von jsPDF (Helvetica, WinAnsi) kennt manche Zeichen nicht → ersetzen statt Kauderwelsch.
const PDF_MAP = [[/→/g, '->'], [/[„“”]/g, '"'], [/[‚‘’]/g, "'"], [/–|—/g, '-'], [/…/g, '...'], [/≥/g, '>='], [/≤/g, '<='], [/₂/g, '2'], [/ø/g, 'Ø']];
export function pdfSafe(s) {
  let out = String(s);
  for (const [re, rep] of PDF_MAP) out = out.replace(re, rep);
  return out;
}

async function newDoc() {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const text = doc.text.bind(doc);
  doc.text = (txt, ...rest) => text(Array.isArray(txt) ? txt.map(pdfSafe) : pdfSafe(txt), ...rest);
  return doc;
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
    [t('pdf.area'), `${stats.areaHa.toFixed(2)} ha`],
    [t('pdf.perimeter'), `${Math.round(stats.perimeterM)} m`],
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

/**
 * QR-Plaketten: 8 Etiketten je A4-Seite (2 × 4), je Etikett QR + Nummer + Baumart + Fläche.
 * Für wetterfeste Etiketten (z. B. Polyester-Folie) oder laminiert am Baum.
 */
export async function qrLabelsPdf({ t, plotName, trees, qrFor }) {
  const doc = await newDoc();
  const W = 91, H = 60, X0 = 14, Y0 = 20;
  for (const [i, tr] of trees.entries()) {
    if (i > 0 && i % 8 === 0) doc.addPage();
    const slot = i % 8, col = slot % 2, row = Math.floor(slot / 2);
    const x = X0 + col * (W + 2), y = Y0 + row * (H + 6);
    doc.setDrawColor(160); doc.setLineDashPattern([1, 1], 0); doc.rect(x, y, W, H); doc.setLineDashPattern([], 0);
    doc.addImage(await qrFor(tr.id), 'PNG', x + 3, y + 5, 50, 50);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text(`#${i + 1}`, x + 56, y + 14);
    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    doc.text(doc.splitTextToSize(tr.data.species || t('ev.kind.habitat_tree'), 32), x + 56, y + 21);
    doc.text(doc.splitTextToSize(plotName || '', 32), x + 56, y + 36);
    doc.setFontSize(7); doc.setTextColor(90, 90, 90);
    doc.text(`BHD ${tr.data.bhdCm ?? '–'} cm`, x + 56, y + 47);
    doc.text(tr.hash.slice(0, 16), x + 56, y + 52);
  }
  doc.setFontSize(8); doc.setTextColor(90, 90, 90);
  doc.text(t('qr.printHint'), 14, 290, { maxWidth: 182 });
  return doc.output('blob');
}

/**
 * Auditor-Mappe einer Fläche: Deckblatt mit Kennzahlen, Mikrohabitat-Vielfalt, Nachweisliste mit
 * Vertrauensstufe und Fingerabdruck, je Habitatbaum eine Zeile; Prüfanleitung am Ende.
 */
export async function auditFolderPdf({ t, num, plot, stats, records, levels, trees, keyId, chainOk, tremSummary }) {
  const doc = await newDoc();
  header(doc, t('audit.folder.title'), plot.data.name);
  let y = lines(doc, 42, [
    [t('pdf.area'), `${num(stats.areaHa, 2)} ha · ${t('plot.perimeter', { m: num(stats.perimeterM, 0) })}`],
    [t('set.profile'), stats.profileLabel],
    [t('plot.detail.trees'), `${trees.length} · ${t('plot.detail.perHa', { n: num(stats.perHa, 1) })}${stats.target ? ` · ${t('plot.detail.target', { n: stats.target })}` : ''}`],
    [t('audit.folder.trems'), tremSummary],
    [t('plot.detail.deadwood'), stats.deadwood != null ? `${num(stats.deadwood, 1)} m³/ha` : '–'],
    [t('audit.folder.records'), `${records.length} · ${chainOk ? t('audit.folder.chainOk') : t('audit.folder.chainBroken')}`],
    [t('set.device'), keyId],
  ]);
  y += 4;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(t('audit.folder.list'), 14, y); y += 6;
  doc.setFontSize(8); doc.setFont(undefined, 'normal');
  for (const r of records) {
    if (y > 270) { doc.addPage(); y = 20; }
    const lv = levels?.get(r.id)?.level || '?';
    const label = `${t(`ev.kind.${r.kind}`)}${r.data?.species ? ` · ${r.data.species}` : r.data?.name ? ` · ${r.data.name}` : ''}`;
    doc.text(`${lv}`, 14, y);
    doc.text(doc.splitTextToSize(label, 70), 20, y);
    doc.text(r.createdAt.slice(0, 16).replace('T', ' '), 92, y);
    doc.text(r.position ? `${r.position.lat.toFixed(5)}, ${r.position.lng.toFixed(5)}` : '–', 120, y);
    doc.text(`${r.hash.slice(0, 20)}…`, 152, y);
    y += 6;
  }
  if (y > 240) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(t('audit.folder.how'), 14, y); y += 6;
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  for (const k of ['audit.folder.how1', 'audit.folder.how2', 'audit.folder.how3']) {
    const w = doc.splitTextToSize(t(k), 180); doc.text(w, 14, y); y += 5 * w.length + 2;
  }
  footer(doc, t, records);
  return doc.output('blob');
}
