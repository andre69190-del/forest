/**
 * BIOGLOW Forest – Signatur- und Prüfkette (ohne DOM, getestet in src/test/trust.test.js).
 *
 * Prinzip: „manipulationserkennbar", nicht „unfälschbar".
 *  1. Jedes Gerät erzeugt einmalig ein ECDSA-P-256-Schlüsselpaar. Der private Schlüssel ist
 *     NICHT exportierbar (WebCrypto, extractable=false) und bleibt in IndexedDB.
 *  2. Jeder Nachweis wird kanonisch serialisiert (sortierte Schlüssel), mit SHA-256 gehasht
 *     und signiert. Fotos gehen als SHA-256 ihrer Bytes ein – ein geändertes Pixel bricht die Signatur.
 *  3. Jeder Nachweis enthält den Hash des vorherigen (prevHash) → lückenlose Kette pro Gerät.
 *  4. Vertrauensstufe A/B/C (siehe trustLevel). Stufe A braucht Geräte-Attest + Server-Zeitstempel
 *     und ist erst mit der nativen App (Phase 1b) erreichbar – die PWA erreicht höchstens B.
 */

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();

export const GENESIS = '0'.repeat(64);
export const SIG_ALG = { name: 'ECDSA', namedCurve: 'P-256' };
export const SIG_PARAMS = { name: 'ECDSA', hash: 'SHA-256' };

/** Stabile JSON-Serialisierung: Schlüssel sortiert, keine Leerzeichen, undefined entfällt. */
export function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonicalize(v))).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

export function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? enc.encode(data) : data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return toHex(await subtle().digest('SHA-256', bytes));
}

/** Neues Geräte-Schlüsselpaar. Privater Schlüssel nicht exportierbar. */
export async function createDeviceKey() {
  const pair = await subtle().generateKey(SIG_ALG, false, ['sign', 'verify']);
  const publicJwk = await subtle().exportKey('jwk', pair.publicKey);
  const keyId = (await sha256Hex(canonicalize({ crv: publicJwk.crv, kty: publicJwk.kty, x: publicJwk.x, y: publicJwk.y }))).slice(0, 16);
  return { keyId, privateKey: pair.privateKey, publicKey: pair.publicKey, publicJwk };
}

export async function importPublicJwk(jwk) {
  return subtle().importKey('jwk', jwk, SIG_ALG, true, ['verify']);
}

/** Felder, die nicht in die Signatur eingehen (sie entstehen erst durch das Signieren). */
const UNSIGNED = ['hash', 'signature', 'verify', 'server'];
export function signedBody(record) {
  const body = {};
  for (const k of Object.keys(record)) if (!UNSIGNED.includes(k)) body[k] = record[k];
  return body;
}

/**
 * Signiert einen Nachweis. body muss enthalten: id, kind, createdAt, prevHash, deviceKeyId.
 * Rückgabe: Nachweis mit hash (SHA-256 des kanonischen Körpers) und signature (hex, IEEE P1363).
 */
export async function signRecord(body, privateKey) {
  for (const f of ['id', 'kind', 'createdAt', 'prevHash', 'deviceKeyId']) {
    if (body[f] === undefined || body[f] === null || body[f] === '') throw new Error(`Pflichtfeld fehlt: ${f}`);
  }
  const canon = canonicalize(signedBody(body));
  const hash = await sha256Hex(canon);
  const sig = await subtle().sign(SIG_PARAMS, privateKey, enc.encode(canon));
  return { ...signedBody(body), hash, signature: toHex(sig) };
}

/**
 * Prüft einen einzelnen Nachweis.
 * media: optionale Map mediaId → Bytes; dann wird auch jeder Foto-Hash nachgerechnet.
 * Rückgabe: { hashOk, signatureOk, mediaOk, problems: [code] }
 */
export async function verifyRecord(record, publicKey, media = null) {
  const problems = [];
  const canon = canonicalize(signedBody(record));
  const hash = await sha256Hex(canon);
  const hashOk = hash === record.hash;
  if (!hashOk) problems.push('hash_mismatch');
  let signatureOk = false;
  try {
    signatureOk = await subtle().verify(SIG_PARAMS, publicKey, fromHex(record.signature || ''), enc.encode(canon));
  } catch { signatureOk = false; }
  if (!signatureOk) problems.push('signature_invalid');
  let mediaOk = true;
  if (media && Array.isArray(record.media)) {
    for (const m of record.media) {
      const bytes = media.get(m.id);
      if (!bytes) { mediaOk = false; problems.push('media_missing'); continue; }
      if ((await sha256Hex(bytes)) !== m.sha256) { mediaOk = false; problems.push('media_changed'); }
    }
  }
  return { hashOk, signatureOk, mediaOk, problems };
}

/** Prüft die Kette (Nachweise eines Geräts, in Erstellungsreihenfolge). Liefert die Indizes mit Bruch. */
export function verifyChain(records) {
  const breaks = [];
  let prev = GENESIS;
  records.forEach((r, i) => {
    if (r.prevHash !== prev) breaks.push(i);
    prev = r.hash;
  });
  return { ok: breaks.length === 0, breaks };
}

/**
 * Vertrauensstufe eines geprüften Nachweises.
 *  A – Kamera der App, Signatur ok, Foto-Hashes ok, Geräte-Attest UND Server-Zeitstempel vorhanden
 *  B – Kamera der App, Signatur ok, Foto-Hashes ok (PWA / ohne Attest)
 *  C – alles andere (Datei-Import, Signatur- oder Kettenbruch, Plausibilitätsfehler)
 */
export function trustLevel(record, verification, { chainOk = true, plausibilityErrors = 0 } = {}) {
  const v = verification || {};
  const intact = v.hashOk && v.signatureOk && v.mediaOk !== false && chainOk && plausibilityErrors === 0;
  if (!intact) return 'C';
  const allCamera = !record.media || record.media.every((m) => m.source === 'camera');
  if (!allCamera) return 'C';
  if (record.attestation && record.server && record.server.timestamp) return 'A';
  return 'B';
}

/** Regelbasierte Plausibilität (nur Hinweise): liefert [{level:'error'|'warn', code}] */
export function plausibility(record, { now = Date.now(), maxGpsAccuracyM = 30 } = {}) {
  const out = [];
  const created = Date.parse(record.createdAt);
  if (!Number.isFinite(created)) out.push({ level: 'error', code: 'bad_time' });
  else if (created > now + 5 * 60 * 1000) out.push({ level: 'error', code: 'future_time' });
  const pos = record.position;
  if (!pos) out.push({ level: 'warn', code: 'no_position' });
  else {
    if (Math.abs(pos.lat) > 90 || Math.abs(pos.lng) > 180) out.push({ level: 'error', code: 'bad_position' });
    if (pos.accuracy > maxGpsAccuracyM) out.push({ level: 'warn', code: 'low_gps_accuracy' });
    if (pos.timestamp && Number.isFinite(created) && Math.abs(pos.timestamp - created) > 10 * 60 * 1000) {
      out.push({ level: 'warn', code: 'position_stale' });
    }
  }
  (record.media || []).forEach((m) => {
    if (m.sharpness !== undefined && m.sharpness < 40) out.push({ level: 'warn', code: 'photo_blurry' });
  });
  return out;
}
