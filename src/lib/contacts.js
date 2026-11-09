/**
 * BIOGLOW Forest – Gesprächsnotizen (Konferenz, Termine): vCard, Follow-up-Mail, CSV.
 * Reine Funktionen, getestet in src/test/contacts.test.js.
 */
export const TOPICS = ['eudr', 'group_cert', 'wood_construction', 'finance', 'biodiversity', 'carbon', 'other'];

const vEsc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** vCard 3.0 – lässt sich auf iPhone/Android direkt als Kontakt öffnen. */
export function toVCard(c, noteText = '') {
  const [first = '', ...rest] = String(c.name || '').trim().split(/\s+/);
  const last = rest.join(' ');
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${vEsc(last)};${vEsc(first)};;;`, `FN:${vEsc(c.name)}`,
    c.org && `ORG:${vEsc(c.org)}`, c.role && `TITLE:${vEsc(c.role)}`,
    c.email && `EMAIL;TYPE=INTERNET:${vEsc(c.email)}`, c.phone && `TEL;TYPE=CELL:${vEsc(c.phone)}`,
    noteText && `NOTE:${vEsc(noteText)}`, 'END:VCARD',
  ].filter(Boolean);
  return `${lines.join('\r\n')}\r\n`;
}

/** mailto-Link für eine Follow-up-Mail (Betreff + Text in der Nutzersprache). */
export function followUpMailto(c, { subject, body }) {
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${encodeURIComponent(c.email || '')}?${q}`;
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** CSV mit Semikolon (Excel-DE-tauglich), UTF-8 mit BOM. */
export function toCsv(rows, header) {
  return `\uFEFF${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`;
}
