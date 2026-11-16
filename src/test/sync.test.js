import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../lib/db.js';
import { createEvidence } from '../lib/evidence.js';
import { push, pull, pendingRecords, verifyPeers, syncNow } from '../lib/sync.js';
import { createDeviceKey, signRecord, sha256Hex, GENESIS } from '../lib/trust.js';

/** Fake-Server: speichert wie Supabase, Duplikate per Hash/ID. */
function fakeServer() {
  const s = { devices: [], records: [], media: [], files: new Map() };
  const api = {
    registerDevice: async (row) => { if (!s.devices.find((d) => d.key_id === row.key_id)) s.devices.push({ ...row, user_id: 'me' }); },
    insertRecord: async (row) => {
      if (s.records.find((r) => r.id === row.id || r.hash === row.hash)) return { duplicate: true };
      const uploaded_at = new Date().toISOString();
      s.records.push({ ...row, uploaded_at });
      return { uploaded_at };
    },
    uploadFile: async (path, bytes) => { s.files.set(path, bytes); },
    insertMedia: async (row) => { if (!s.media.find((m) => m.id === row.id)) s.media.push(row); },
    listRecords: async () => s.records,
    listDevices: async () => s.devices,
    listMedia: async (ids) => s.media.filter((m) => ids.includes(m.record_id)),
    downloadFile: async (path) => s.files.get(path),
  };
  return { s, api };
}

const photo = new Uint8Array([9, 8, 7, 6, 5]);

describe('Sync', () => {
  let srv;
  beforeAll(async () => {
    srv = fakeServer();
    await createEvidence('habitat_tree', { species: 'Rotbuche', bhdCm: 50, trems: ['nests'] },
      { position: { lat: 49, lng: 8, accuracy: 5, timestamp: Date.now() }, photos: [{ bytes: photo, type: 'image/jpeg', source: 'camera', sharpness: 80 }] });
    await createEvidence('visit', { place: 'Test' });
  });

  it('lädt eigene Nachweise unverändert hoch – inkl. Foto – und nur einmal', async () => {
    expect((await pendingRecords()).length).toBe(2);
    const r = await push(srv.api, { userId: 'me', groupId: 'g1' });
    expect(r.uploaded).toBe(2);
    expect(srv.s.records.length).toBe(2);
    expect(srv.s.records[0].record.hash).toBe(srv.s.records[0].hash);
    expect(srv.s.records[0].record._sync).toBeUndefined();
    expect(srv.s.media.length).toBe(1);
    expect(srv.s.files.size).toBe(1);
    expect(srv.s.records.every((x) => x.group_id === 'g1')).toBe(true);
    expect((await pendingRecords()).length).toBe(0);
    expect((await push(srv.api, { userId: 'me' })).uploaded).toBe(0);
    const local = await db.records.get(srv.s.records[0].id);
    expect(local.server.timestamp).toBeTruthy();
  });

  it('übernimmt gültige Nachweise anderer Geräte und verwirft gefälschte', async () => {
    const peer = await createDeviceKey();
    srv.s.devices.push({ key_id: peer.keyId, public_jwk: peer.publicJwk, user_id: 'ben' });
    const peerPhoto = new Uint8Array([1, 1, 2, 3, 5, 8]);
    const good = await signRecord({ id: crypto.randomUUID(), kind: 'habitat_tree', createdAt: new Date().toISOString(), seq: 1,
      prevHash: GENESIS, deviceKeyId: peer.keyId, data: { species: 'Eiche', trems: ['rot_holes'] },
      media: [{ id: 'pm1', sha256: await sha256Hex(peerPhoto), source: 'camera' }] }, peer.privateKey);
    const forged = { ...(await signRecord({ id: crypto.randomUUID(), kind: 'habitat_tree', createdAt: new Date().toISOString(), seq: 2,
      prevHash: good.hash, deviceKeyId: peer.keyId, data: { species: 'Kiefer', bhdCm: 30 } }, peer.privateKey)) };
    forged.data = { ...forged.data, bhdCm: 90 }; // nachträglich verändert
    for (const rec of [good, forged]) {
      srv.s.records.push({ id: rec.id, user_id: 'ben', group_id: 'g1', device_key_id: peer.keyId, uploaded_at: new Date().toISOString(), record: rec });
    }
    srv.s.media.push({ id: 'pm1', record_id: good.id, path: 'ben/pm1.jpg', sha256: good.media[0].sha256 });
    srv.s.files.set('ben/pm1.jpg', peerPhoto);

    const res = await pull(srv.api, { userId: 'me' });
    expect(res).toMatchObject({ received: 1, rejected: 1 });
    const stored = await db.records.get(good.id);
    expect(stored._sync.remote).toBe(true);
    expect(await db.records.get(forged.id)).toBeUndefined();
    expect((await db.media.get('pm1')).bytes.length).toBe(6);
    const levels = await verifyPeers();
    expect(levels.get(good.id).level).toBe('B');
    // eigene Nachweise werden beim Abholen nicht dupliziert
    expect((await db.records.toArray()).length).toBe(3);
  });

  it('syncNow merkt sich den Zeitpunkt', async () => {
    const r = await syncNow(srv.api, { userId: 'me' });
    expect(r.at).toBeTruthy();
    expect((await db.settings.get('lastSync')).value).toBe(r.at);
  });
});
