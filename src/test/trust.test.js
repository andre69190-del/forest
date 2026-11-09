import { describe, it, expect } from 'vitest';
import { canonicalize, createDeviceKey, signRecord, verifyRecord, verifyChain, trustLevel, plausibility, sha256Hex, GENESIS, importPublicJwk } from '../lib/trust.js';

const photo = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

async function makeRecord(key, prevHash = GENESIS, extra = {}) {
  return signRecord({
    id: crypto.randomUUID(), kind: 'habitat_tree', createdAt: new Date().toISOString(),
    prevHash, deviceKeyId: key.keyId, position: { lat: 49.3, lng: 8.64, accuracy: 6, timestamp: Date.now() },
    data: { bhdCm: 45, trems: ['woodpecker_cavities'] },
    media: [{ id: 'm1', sha256: await sha256Hex(photo), source: 'camera', sharpness: 80 }],
    ...extra,
  }, key.privateKey);
}

describe('Kanonische Form', () => {
  it('Schlüsselreihenfolge egal, undefined entfällt', () => {
    expect(canonicalize({ b: 1, a: { d: [1, 2], c: undefined } })).toBe(canonicalize({ a: { d: [1, 2] }, b: 1 }));
  });
});

describe('Signatur', () => {
  it('unveränderter Nachweis ist gültig (auch mit importiertem öffentlichen Schlüssel)', async () => {
    const key = await createDeviceKey();
    const rec = await makeRecord(key);
    const pub = await importPublicJwk(key.publicJwk);
    const v = await verifyRecord(rec, pub, new Map([['m1', photo]]));
    expect(v.problems).toEqual([]);
    expect(trustLevel(rec, v)).toBe('B');
  });
  it('geänderter Messwert bricht Hash und Signatur', async () => {
    const key = await createDeviceKey();
    const rec = await makeRecord(key);
    const forged = { ...rec, data: { ...rec.data, bhdCm: 60 } };
    const v = await verifyRecord(forged, key.publicKey);
    expect(v.hashOk).toBe(false);
    expect(v.signatureOk).toBe(false);
    expect(trustLevel(forged, v)).toBe('C');
  });
  it('ein geändertes Pixel wird erkannt', async () => {
    const key = await createDeviceKey();
    const rec = await makeRecord(key);
    const changed = photo.slice(); changed[3] = 99;
    const v = await verifyRecord(rec, key.publicKey, new Map([['m1', changed]]));
    expect(v.problems).toContain('media_changed');
    expect(trustLevel(rec, v)).toBe('C');
  });
  it('fremder Schlüssel wird abgelehnt', async () => {
    const a = await createDeviceKey(), b = await createDeviceKey();
    const rec = await makeRecord(a);
    expect((await verifyRecord(rec, b.publicKey)).signatureOk).toBe(false);
  });
  it('importiertes Foto (Datei) erreicht höchstens Stufe C', async () => {
    const key = await createDeviceKey();
    const rec = await makeRecord(key, GENESIS, { media: [{ id: 'm1', sha256: await sha256Hex(photo), source: 'file' }] });
    const v = await verifyRecord(rec, key.publicKey);
    expect(trustLevel(rec, v)).toBe('C');
  });
  it('Pflichtfelder werden erzwungen', async () => {
    const key = await createDeviceKey();
    await expect(signRecord({ id: 'x', kind: 'k' }, key.privateKey)).rejects.toThrow();
  });
});

describe('Kette', () => {
  it('lückenlose Kette ok, entfernter Eintrag wird erkannt', async () => {
    const key = await createDeviceKey();
    const r1 = await makeRecord(key);
    const r2 = await makeRecord(key, r1.hash);
    const r3 = await makeRecord(key, r2.hash);
    expect(verifyChain([r1, r2, r3]).ok).toBe(true);
    expect(verifyChain([r1, r3]).breaks).toEqual([1]);
  });
});

describe('Plausibilität', () => {
  it('Zeit in der Zukunft und schlechtes GPS', () => {
    const p = plausibility({ createdAt: new Date(Date.now() + 3600e3).toISOString(), position: { lat: 1, lng: 1, accuracy: 80 } });
    expect(p.map((x) => x.code)).toEqual(expect.arrayContaining(['future_time', 'low_gps_accuracy']));
  });
  it('Stufe A nur mit Attest und Server-Zeitstempel', () => {
    const v = { hashOk: true, signatureOk: true, mediaOk: true };
    const rec = { media: [{ source: 'camera' }], attestation: { ok: true }, server: { timestamp: 'x' } };
    expect(trustLevel(rec, v)).toBe('A');
  });
});
