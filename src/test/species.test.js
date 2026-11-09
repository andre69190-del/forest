import { describe, it, expect } from 'vitest';
import { identifySpecies, speciesLabel } from '../lib/species.js';

const photo = { bytes: new Uint8Array([1, 2, 3]), type: 'image/jpeg' };
const ok = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

describe('Artbestimmung (Pl@ntNet)', () => {
  it('liefert Top-Ergebnisse mit Prozent und Trivialname', async () => {
    const res = await identifySpecies([photo], { key: 'k', fetchImpl: ok({
      remainingIdentificationRequests: 480,
      results: [{ score: 0.913, species: { scientificNameWithoutAuthor: 'Fagus sylvatica', commonNames: ['Rotbuche'] } }],
    }) });
    expect(res.remaining).toBe(480);
    expect(res.results[0]).toEqual({ scientificName: 'Fagus sylvatica', commonName: 'Rotbuche', score: 91 });
    expect(speciesLabel(res.results[0])).toBe('Rotbuche (Fagus sylvatica)');
  });
  it('404 = keine Pflanze, 429 = Kontingent, Netzfehler', async () => {
    await expect(identifySpecies([photo], { key: 'k', fetchImpl: ok({}, 404) })).rejects.toMatchObject({ code: 'not_a_plant' });
    await expect(identifySpecies([photo], { key: 'k', fetchImpl: ok({}, 429) })).rejects.toMatchObject({ code: 'quota' });
    await expect(identifySpecies([photo], { key: 'k', fetchImpl: async () => { throw new Error('x'); } })).rejects.toMatchObject({ code: 'network' });
  });
  it('ohne Schlüssel', async () => {
    await expect(identifySpecies([photo], { key: '' })).rejects.toMatchObject({ code: 'no_key' });
  });
});
