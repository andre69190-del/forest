/**
 * BIOGLOW Forest – forstfachliche Logik (ohne DOM, getestet in src/test/forestry.test.js).
 *
 * - Baum-Mikrohabitate (TreMs) nach Larrieu et al. 2018 / WSL-Feldführer 2020:
 *   7 Formen, 15 Gruppen (die 47 Typen folgen als Datenpaket, siehe docs/ROADMAP.md)
 * - Totholz-Volumen per Linienschnitt-Verfahren (Van Wagner 1968)
 * - Habitatbaum-Dichte pro Hektar
 * - Länderprofile mit Zielwerten (Quelle je Profil angegeben)
 */

/** 7 Formen → 15 Gruppen. Schlüssel sind stabil (gehen in Nachweise ein), Texte stehen im i18n. */
export const TREM_FORMS = [
  { key: 'cavities', groups: ['woodpecker_cavities', 'rot_holes', 'insect_galleries', 'concavities'] },
  { key: 'injuries', groups: ['exposed_sapwood', 'exposed_heartwood'] },
  { key: 'crown_deadwood', groups: ['crown_deadwood'] },
  { key: 'excrescences', groups: ['twig_tangles', 'burrs_cankers'] },
  { key: 'fungi', groups: ['perennial_fungi', 'ephemeral_fungi'] },
  { key: 'epiphytes', groups: ['epiphytes_parasites', 'nests', 'microsoil'] },
  { key: 'exudates', groups: ['fresh_exudates'] },
];

export const TREM_GROUPS = TREM_FORMS.flatMap((f) => f.groups);

export function formOfGroup(group) {
  const f = TREM_FORMS.find((x) => x.groups.includes(group));
  return f ? f.key : null;
}

/** Ein Baum ist Habitatbaum, wenn er mindestens ein Mikrohabitat trägt (WSL-Definition). */
export function isHabitatTree(tree) {
  return Array.isArray(tree.trems) && tree.trems.length > 0;
}

/** Zersetzungsgrade 1–5 (frisch … stark zersetzt). */
export const DECAY_CLASSES = [1, 2, 3, 4, 5];

/**
 * Totholz-Volumen (m³/ha) nach Van Wagner: V = π² · Σd² / (8 · L)
 *   d = Durchmesser am Schnittpunkt in cm, L = Gesamtlänge der Linien in m.
 * Nur Stücke ab minDiameterCm (Standard 10 cm, „Derbholz") zählen.
 */
export function lineIntersectVolume(diametersCm, totalLineLengthM, minDiameterCm = 10) {
  if (!(totalLineLengthM > 0)) return 0;
  const sum = diametersCm.filter((d) => d >= minDiameterCm).reduce((s, d) => s + d * d, 0);
  return (Math.PI * Math.PI * sum) / (8 * totalLineLengthM);
}

/**
 * Volumen eines stehenden Totholz-Stamms (m³) als Zylinder mit Formzahl.
 * bhdCm = Brusthöhendurchmesser in cm, heightM = Höhe in m, formFactor ≈ 0,5 für Stämme.
 */
export function standingVolume(bhdCm, heightM, formFactor = 0.5) {
  const r = bhdCm / 200; // cm → m, Radius
  return Math.PI * r * r * heightM * formFactor;
}

/** Habitatbäume pro Hektar. */
export function habitatTreesPerHa(trees, areaHa) {
  if (!(areaHa > 0)) return 0;
  return trees.filter(isHabitatTree).length / areaHa;
}

/**
 * Länderprofile. Jedes Profil nennt seine Quelle; Zielwerte sind nur gesetzt, wo der Standard
 * eine Zahl nennt. „Angemessener Umfang" ohne Zahl → target null, App zeigt nur den Ist-Wert.
 */
export const PROFILES = {
  INT: {
    key: 'INT',
    standard: 'PEFC ST 1003:2024',
    country: null,
    habitatTreesPerHa: null,
    deadwoodShareOfStock: null,
    sourceUrl: 'https://pefc.org/news/revised-pefc-sustainable-forest-management-benchmark-standard-approved',
  },
  DE: {
    key: 'DE',
    standard: 'PEFC D 1002-1:2020',
    country: 'DE',
    habitatTreesPerHa: null, // Standard: Biotopholz „in angemessenem Umfang"
    deadwoodShareOfStock: null,
    sourceUrl: 'https://www.pefc.de/media/filer_public/86/7f/867fa008-6a71-496e-971e-1bacfd0def6e/der_pefc-standard_im_vergleich_mit_gesetzlichen_regelungen.pdf',
  },
  DE_KWM: {
    key: 'DE_KWM',
    standard: 'Förderprogramm Klimaangepasstes Waldmanagement Plus (DE)',
    country: 'DE',
    habitatTreesPerHa: 10, // mind. 1 Mikrohabitat, BHD ≥ 30 cm
    habitatTreeMinBhdCm: 30,
    deadwoodShareOfStock: 0.1, // ≥ 10 % des lebenden Vorrats bis Ende der Bindefrist
    sourceUrl: 'https://bmuv.de/fileadmin/Daten_BMU/Download_PDF/Foerderprogramme/foerderkriterien_klimaangepasstes_waldmanagement_plus.pdf',
  },
};

/** Zählt Habitatbäume, die das Profil anerkennt (BHD-Mindestmaß, falls gesetzt). */
export function countingHabitatTrees(trees, profile) {
  const min = profile.habitatTreeMinBhdCm || 0;
  return trees.filter((t) => isHabitatTree(t) && (!min || (t.bhdCm || 0) >= min));
}

/** Ampel gegen das Profil: 'ok' | 'below' | 'none' (kein Zielwert). */
export function habitatTreeStatus(trees, areaHa, profile) {
  if (!profile.habitatTreesPerHa) return { status: 'none', perHa: habitatTreesPerHa(trees, areaHa) };
  const perHa = areaHa > 0 ? countingHabitatTrees(trees, profile).length / areaHa : 0;
  return { status: perHa >= profile.habitatTreesPerHa ? 'ok' : 'below', perHa, target: profile.habitatTreesPerHa };
}
