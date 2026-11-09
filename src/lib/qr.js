/**
 * BIOGLOW Forest – QR-Plaketten: Inhalt ist eine App-Adresse …/#/baum/<id>.
 * Mit der App gescannt öffnet sich der Baum; mit der normalen Handykamera öffnet sich die App-Seite.
 */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function treeUrl(id, origin = (typeof location !== 'undefined' ? location.origin : 'https://forest.arndt-software.de')) {
  return `${origin}/#/baum/${id}`;
}

/** Baum-ID aus einem gescannten Text (App-Adresse oder reine ID). */
export function parseTreeId(text) {
  const s = String(text || '');
  const m = s.match(/#\/baum\/([0-9a-f-]{36})/i) || s.match(UUID);
  return m ? (m[1] || m[0]).toLowerCase() : null;
}

export async function qrDataUrl(text, size = 256) {
  const QR = await import('qrcode');
  return QR.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' });
}
