/**
 * BIOGLOW Forest – lokale Datenbank (Dexie/IndexedDB). Offline-first: alles landet zuerst hier.
 * Nachweise (records) sind unveränderlich: eine Korrektur ist ein neuer Nachweis mit "supersedes".
 */
import Dexie from 'dexie';

export const db = new Dexie('bioglow-forest');
db.version(1).stores({
  records: 'id, kind, createdAt, plotId, deviceKeyId, seq',
  media: 'id, recordId',
  keys: 'id',
  settings: 'key',
});

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}
export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}
