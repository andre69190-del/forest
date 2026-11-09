/**
 * BIOGLOW Forest – KI-Artbestimmung über Pl@ntNet (Muster aus BIOGLOW plantnetIdentify).
 * Fotos werden NUR auf Knopfdruck an Pl@ntNet (Montpellier, Frankreich) gesendet – siehe Datenschutz.
 *
 * Schlüssel – bewusst NICHT im Quellcode (Repo ist öffentlich):
 *  1. eigener Schlüssel aus den Einstellungen, sonst
 *  2. Build-Variable VITE_PLANTNET_KEY (in Coolify unter „Environment Variables“ als Build-Variable setzen).
 * Im Pl@ntNet-Konto muss die Domain forest.arndt-software.de freigegeben sein.
 */
export const BUILD_PLANTNET_KEY = (import.meta.env && import.meta.env.VITE_PLANTNET_KEY) || '';
export const PLANTNET_URL = 'https://my-api.plantnet.org/v2/identify/all';

/**
 * photos: [{ bytes: Uint8Array, type }], organ: 'auto' | 'bark' | 'leaf' | 'flower' | 'fruit' | 'habit'
 * Rückgabe: { results: [{ scientificName, commonName, score }], remaining }
 * Fehlercodes (error.code): no_key, not_a_plant, quota, network, http_<status>
 */
export async function identifySpecies(photos, { key = BUILD_PLANTNET_KEY, lang = 'de', organ = 'auto', fetchImpl = fetch } = {}) {
  const err = (code) => Object.assign(new Error(code), { code });
  if (!key) throw err('no_key');
  const fd = new FormData();
  for (const [i, p] of photos.slice(0, 5).entries()) {
    fd.append('images', new Blob([p.bytes], { type: p.type || 'image/jpeg' }), `photo${i}.jpg`);
    fd.append('organs', organ);
  }
  const qs = `?api-key=${encodeURIComponent(key)}&lang=${encodeURIComponent(lang)}&nb-results=5`;
  let r;
  try { r = await fetchImpl(PLANTNET_URL + qs, { method: 'POST', body: fd }); } catch { throw err('network'); }
  if (r.status === 404) throw err('not_a_plant');
  if (r.status === 429) throw err('quota');
  if (!r.ok) throw err(`http_${r.status}`);
  const j = await r.json();
  return {
    remaining: j.remainingIdentificationRequests ?? null,
    results: (j.results || []).slice(0, 5).map((x) => ({
      scientificName: x.species?.scientificNameWithoutAuthor || x.species?.scientificName || '?',
      commonName: (x.species?.commonNames || [])[0] || '',
      score: Math.round((x.score || 0) * 100),
    })),
  };
}

/** Anzeige-/Speicherform: „Rotbuche (Fagus sylvatica)" */
export const speciesLabel = (r) => (r.commonName ? `${r.commonName} (${r.scientificName})` : r.scientificName);

/** Ist überhaupt ein Schlüssel verfügbar? (steuert, ob der KI-Knopf angezeigt wird) */
export const hasPlantnetKey = (ownKey) => Boolean(ownKey || BUILD_PLANTNET_KEY);
