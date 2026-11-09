/**
 * BIOGLOW Forest – Demo-Wald: legt echte, signierte Beispiel-Nachweise an (data.demo = true),
 * damit man die App gefüllt sieht. Lage: Schwetzinger Hardt bei Walldorf (öffentlicher Wald).
 * Entfernen über Einstellungen → „Alle lokalen Daten löschen".
 */
import { createEvidence } from './evidence.js';
import { lineIntersectVolume } from './forestry.js';
import { polygonAreaM2, m2ToHa } from './geo.js';

const C = { lat: 49.33215, lng: 8.61540 };
const off = (dLatM, dLngM) => ({ lat: C.lat + dLatM / 111320, lng: C.lng + dLngM / (111320 * Math.cos((C.lat * Math.PI) / 180)) });
const pos = (p, acc = 5) => ({ ...p, accuracy: acc, timestamp: Date.now() });

export async function loadDemoForest() {
  const points = [off(-80, -110), off(-90, 95), off(70, 120), off(95, -60), off(20, -130)];
  const plotKey = crypto.randomUUID();
  await createEvidence('plot', { plotKey, name: 'Demo-Wald Hardt', points, method: 'map', country: 'DE', areaHa: m2ToHa(polygonAreaM2(points)), demo: true }, { position: pos(points[0]) });
  const trees = [
    { at: off(-20, -40), species: 'Rotbuche (Fagus sylvatica)', bhdCm: 62, trems: ['woodpecker_cavities', 'crown_deadwood'] },
    { at: off(30, 10), species: 'Traubeneiche (Quercus petraea)', bhdCm: 78, trems: ['rot_holes', 'perennial_fungi', 'epiphytes_parasites'] },
    { at: off(5, 70), species: 'Waldkiefer (Pinus sylvestris)', bhdCm: 44, trems: ['exposed_sapwood', 'fresh_exudates'] },
    { at: off(-50, 40), species: 'Hainbuche (Carpinus betulus)', bhdCm: 35, trems: ['twig_tangles'] },
  ];
  for (const t of trees) {
    await createEvidence('habitat_tree', { species: t.species, bhdCm: t.bhdCm, heightM: null, alive: true, marking: 'Demo', note: 'Beispieldaten', trems: t.trems, demo: true },
      { position: pos(t.at), plotId: plotKey });
  }
  const pieces = [{ diameterCm: 24, decay: 2 }, { diameterCm: 41, decay: 3 }, { diameterCm: 15, decay: 4 }, { diameterCm: 32, decay: 2 }];
  await createEvidence('deadwood_line', { lineLengthM: 100, pieces, minDiameterCm: 10, volumeM3Ha: Math.round(lineIntersectVolume(pieces.map((p) => p.diameterCm), 100) * 100) / 100, demo: true },
    { position: pos(off(0, 0)), plotId: plotKey });
  await createEvidence('visit', { place: 'Demo: Schwetzinger Hardt', country: 'DE', forestType: 'Kiefern-Eichen-Mischwald auf Sand', people: 'Beispiel', notes: 'Beispiel-Feldbesuch: viel stehendes Totholz, Naturverjüngung von Eiche, Spechtspuren an Altbuchen.', demo: true },
    { position: pos(off(10, 10)) });
  return plotKey;
}
