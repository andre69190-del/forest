/**
 * BIOGLOW Forest – Nachweise anlegen, signieren, prüfen, exportieren.
 * Verbindet die reine Logik (trust.js) mit der lokalen Datenbank (db.js).
 */
import { db } from './db.js';
import { createDeviceKey, signRecord, verifyRecord, verifyChain, trustLevel, plausibility, sha256Hex, GENESIS, importPublicJwk } from './trust.js';

export const APP_VERSION = '0.2.0';

let keyPromise = null;
/** Geräte-Schlüssel laden oder einmalig erzeugen. */
export function getDeviceKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      const row = await db.keys.get('device');
      if (row) return row;
      const k = await createDeviceKey();
      const stored = { id: 'device', keyId: k.keyId, privateKey: k.privateKey, publicJwk: k.publicJwk, createdAt: new Date().toISOString() };
      await db.keys.put(stored);
      return stored;
    })();
  }
  return keyPromise;
}

// Alle Signaturen laufen nacheinander, damit prevHash immer stimmt.
let queue = Promise.resolve();
function serial(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/**
 * Legt einen signierten Nachweis an.
 * photos: [{ bytes: Uint8Array, type, source: 'camera'|'file', sharpness? }]
 */
export function createEvidence(kind, data, { position = null, photos = [], plotId = null, supersedes = null } = {}) {
  return serial(async () => {
    const key = await getDeviceKey();
    const last = await db.records.where('deviceKeyId').equals(key.keyId).sortBy('seq');
    const prev = last.length ? last.at(-1) : null;
    const id = crypto.randomUUID();
    const media = [];
    for (const p of photos) {
      const mid = crypto.randomUUID();
      media.push({ id: mid, sha256: await sha256Hex(p.bytes), type: p.type || 'image/jpeg', source: p.source, sharpness: p.sharpness });
      await db.media.put({ id: mid, recordId: id, bytes: p.bytes, type: p.type || 'image/jpeg' });
    }
    const body = {
      id, kind, createdAt: new Date().toISOString(), seq: prev ? prev.seq + 1 : 1,
      prevHash: prev ? prev.hash : GENESIS, deviceKeyId: key.keyId, appVersion: APP_VERSION,
      platform: 'pwa', position, plotId, supersedes, data, media,
    };
    const rec = await signRecord(body, key.privateKey);
    await db.records.put(rec);
    return rec;
  });
}

/** Prüft alle Nachweise dieses Geräts. Rückgabe: Map id → { level, problems, warnings } */
export async function verifyAll() {
  const key = await getDeviceKey();
  const pub = await importPublicJwk(key.publicJwk);
  const recs = await db.records.where('deviceKeyId').equals(key.keyId).sortBy('seq');
  const chain = verifyChain(recs);
  const out = new Map();
  for (let i = 0; i < recs.length; i++) {
    const r = recs[i];
    const mediaRows = await db.media.where('recordId').equals(r.id).toArray();
    const v = await verifyRecord(r, pub, new Map(mediaRows.map((m) => [m.id, m.bytes])));
    const pl = plausibility(r);
    const chainOk = !chain.breaks.includes(i);
    const problems = [...v.problems, ...(chainOk ? [] : ['chain_break'])];
    out.set(r.id, {
      level: trustLevel(r, v, { chainOk, plausibilityErrors: pl.filter((x) => x.level === 'error').length }),
      problems, warnings: pl.map((x) => x.code),
    });
  }
  return { results: out, chain, count: recs.length };
}

/** Prüf-Paket für Auditoren: alle Nachweise + öffentlicher Schlüssel (+ optional Fotos als Base64). */
export async function exportBundle({ withPhotos = true, recordIds = null } = {}) {
  const key = await getDeviceKey();
  let records = await db.records.where('deviceKeyId').equals(key.keyId).sortBy('seq');
  const chainRecords = records;
  if (recordIds) records = records.filter((r) => recordIds.includes(r.id));
  const media = {};
  if (withPhotos) {
    for (const r of records) for (const m of r.media || []) {
      const row = await db.media.get(m.id);
      if (row) media[m.id] = bytesToBase64(row.bytes);
    }
  }
  return {
    format: 'bioglow-forest-bundle/1',
    exportedAt: new Date().toISOString(),
    device: { keyId: key.keyId, publicJwk: key.publicJwk },
    chainHashes: chainRecords.map((r) => ({ seq: r.seq, hash: r.hash, prevHash: r.prevHash })),
    records, media,
  };
}

/** Prüft ein fremdes Paket vollständig im Browser (Auditor-Ansicht, kein Server nötig). */
export async function verifyBundle(bundle) {
  if (!bundle || bundle.format !== 'bioglow-forest-bundle/1') throw new Error('unknown_format');
  const pub = await importPublicJwk(bundle.device.publicJwk);
  const chain = verifyChain(bundle.chainHashes.map((c) => ({ hash: c.hash, prevHash: c.prevHash })));
  const byHash = new Set(bundle.chainHashes.map((c) => c.hash));
  const media = new Map(Object.entries(bundle.media || {}).map(([id, b64]) => [id, base64ToBytes(b64)]));
  const results = [];
  for (const r of bundle.records) {
    const v = await verifyRecord(r, pub, media.size ? media : null);
    const pl = plausibility(r);
    const inChain = byHash.has(r.hash);
    const level = trustLevel(r, v, { chainOk: chain.ok && inChain, plausibilityErrors: pl.filter((x) => x.level === 'error').length });
    results.push({ id: r.id, kind: r.kind, createdAt: r.createdAt, level, problems: [...v.problems, ...(inChain ? [] : ['chain_break'])], warnings: pl.map((x) => x.code) });
  }
  return { chainOk: chain.ok, results };
}

export function bytesToBase64(bytes) {
  let s = '';
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

/** Aktueller Stand je Objekt: ersetzte Nachweise ausblenden. */
export function latestOnly(records) {
  const superseded = new Set(records.map((r) => r.supersedes).filter(Boolean));
  return records.filter((r) => !superseded.has(r.id));
}

/** Löscht ALLE lokalen Daten inkl. Geräte-Schlüssel (danach beginnt eine neue Kette). */
export async function wipeAllLocalData() {
  await Promise.all([db.records.clear(), db.media.clear(), db.keys.clear(), db.settings.clear()]);
  keyPromise = null;
}
