/**
 * BIOGLOW Forest – Abgleich mit dem Server (Sync). Getestet in src/test/sync.test.js mit einem Fake-Server.
 *
 * Grundsatz: Der Server speichert und verteilt nur. Nachweise gehen UNVERÄNDERT hoch (komplett als JSON);
 * empfangene Nachweise anderer Geräte werden hier mit deren öffentlichem Schlüssel geprüft, bevor sie
 * angezeigt werden. Server-Zusatzinfos stehen in den nicht signierten Feldern `_sync` und `server`.
 *
 * api (Adapter, siehe cloud.js) – alle Methoden async:
 *   registerDevice({ key_id, public_jwk })            Gerät anmelden (Konflikt = schon da, ok)
 *   insertRecord(row) → { uploaded_at }               Nachweis hochladen (Duplikat → { duplicate: true })
 *   uploadFile(path, bytes, type)                     Foto hochladen (existiert → ok)
 *   insertMedia(row)                                  Foto-Zuordnung (Duplikat → ok)
 *   listRecords() → [row]                             alle sichtbaren Nachweise (eigene + Gruppen)
 *   listDevices() → [{ key_id, public_jwk, user_id }] sichtbare Geräteschlüssel
 *   listMedia(recordIds) → [{ id, record_id, path, sha256 }]
 *   downloadFile(path) → Uint8Array
 */
import { db } from './db.js';
import { getDeviceKey } from './evidence.js';
import { importPublicJwk, verifyRecord, sha256Hex } from './trust.js';

const ext = (type) => (type === 'image/png' ? 'png' : 'jpg');

/** Eigene, noch nicht hochgeladene Nachweise (in Kettenreihenfolge). */
export async function pendingRecords() {
  const key = await getDeviceKey();
  const own = await db.records.where('deviceKeyId').equals(key.keyId).sortBy('seq');
  const done = new Set((await db.synced.toArray()).map((s) => s.id));
  return own.filter((r) => !done.has(r.id));
}

/** Lädt alle ausstehenden eigenen Nachweise samt Fotos hoch. groupId: null = privat. */
export async function push(api, { userId, groupId = null, onProgress = () => {} } = {}) {
  const key = await getDeviceKey();
  await api.registerDevice({ key_id: key.keyId, public_jwk: key.publicJwk });
  const todo = await pendingRecords();
  let n = 0;
  for (const r of todo) {
    // Fotos zuerst in den Speicher, Zuordnung erst nach dem Nachweis (Fremdschlüssel)
    const mediaRows = [];
    for (const m of r.media || []) {
      const row = await db.media.get(m.id);
      if (!row) continue;
      const path = `${userId}/${m.id}.${ext(row.type)}`;
      await api.uploadFile(path, row.bytes, row.type);
      mediaRows.push({ id: m.id, record_id: r.id, user_id: userId, path, sha256: m.sha256 });
    }
    const clean = { ...r };
    delete clean._sync; delete clean.server;
    const res = await api.insertRecord({
      id: r.id, user_id: userId, group_id: groupId, device_key_id: r.deviceKeyId, seq: r.seq, kind: r.kind,
      hash: r.hash, prev_hash: r.prevHash, created_at: r.createdAt, record: clean,
    });
    for (const mr of mediaRows) await api.insertMedia(mr);
    const uploadedAt = res?.uploaded_at || new Date().toISOString();
    await db.synced.put({ id: r.id, uploadedAt, groupId });
    if (!res?.duplicate) await db.records.update(r.id, { server: { timestamp: uploadedAt, received: true } });
    onProgress(++n, todo.length);
  }
  return { uploaded: n };
}

/**
 * Holt Nachweise anderer Geräte (Gruppe), prüft jede Signatur mit dem öffentlichen Schlüssel des Geräts
 * und speichert nur gültige. Fotos werden mitgeladen und gegen ihren Hash geprüft.
 */
export async function pull(api, { userId } = {}) {
  const key = await getDeviceKey();
  const devices = await api.listDevices();
  for (const d of devices) {
    if (d.key_id !== key.keyId) await db.peers.put({ keyId: d.key_id, publicJwk: d.public_jwk, userId: d.user_id });
  }
  const rows = await api.listRecords();
  const local = new Set((await db.records.toCollection().primaryKeys()));
  const fresh = rows.filter((row) => row.device_key_id !== key.keyId && !local.has(row.id));
  const mediaList = fresh.length ? await api.listMedia(fresh.map((r) => r.id)) : [];
  let stored = 0, rejected = 0;
  for (const row of fresh) {
    const peer = await db.peers.get(row.device_key_id);
    if (!peer) { rejected++; continue; }
    const rec = row.record;
    const v = await verifyRecord(rec, await importPublicJwk(peer.publicJwk));
    if (!v.hashOk || !v.signatureOk) { rejected++; continue; }
    for (const m of mediaList.filter((x) => x.record_id === row.id)) {
      try {
        const bytes = await api.downloadFile(m.path);
        if ((await sha256Hex(bytes)) === m.sha256) {
          await db.media.put({ id: m.id, recordId: row.id, bytes, type: m.path.endsWith('.png') ? 'image/png' : 'image/jpeg' });
        }
      } catch { /* Foto später erneut versuchen */ }
    }
    await db.records.put({
      ...rec,
      server: { timestamp: row.uploaded_at, received: true },
      _sync: { remote: true, userId: row.user_id, groupId: row.group_id, uploadedAt: row.uploaded_at },
    });
    stored++;
  }
  return { received: stored, rejected, own: userId };
}

/** Kompletter Abgleich. */
export async function syncNow(api, opts) {
  const up = await push(api, opts);
  const down = await pull(api, opts);
  const at = new Date().toISOString();
  await db.settings.put({ key: 'lastSync', value: at });
  return { ...up, ...down, at };
}

/** Nachweise anderer Geräte prüfen (Signatur + Fotos). Kette wird nicht verlangt: Gruppen sehen nur Geteiltes. */
export async function verifyPeers() {
  const out = new Map();
  const remote = (await db.records.toArray()).filter((r) => r._sync?.remote);
  for (const r of remote) {
    const peer = await db.peers.get(r.deviceKeyId);
    if (!peer) { out.set(r.id, { level: 'C', problems: ['signature_invalid'], warnings: [] }); continue; }
    const media = new Map((await db.media.where('recordId').equals(r.id).toArray()).map((m) => [m.id, m.bytes]));
    const v = await verifyRecord(r, await importPublicJwk(peer.publicJwk), media.size ? media : null);
    const ok = v.hashOk && v.signatureOk && v.mediaOk;
    const camera = (r.media || []).every((m) => m.source === 'camera');
    out.set(r.id, { level: ok && camera ? 'B' : 'C', problems: v.problems, warnings: [] });
  }
  return out;
}
