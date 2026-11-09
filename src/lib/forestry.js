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

/**
 * Die 47 Mikrohabitat-Typen (Bütler et al. 2020, WSL-Feldführer nach Larrieu et al. 2018) → Gruppe.
 * Eigene, stabile Schlüssel (gehen in Nachweise ein); Namen + Mindestgrößen stehen im i18n (trem.t.*, trem.min.*).
 * Quelle Mindestgrößen: https://wsl.ch/en/publications/guida-da-campo-ai-dendromicrohabitat
 */
export const TREM_TYPES = [
  { key: 'wp_small', group: 'woodpecker_cavities' },
  { key: 'wp_medium', group: 'woodpecker_cavities' },
  { key: 'wp_large', group: 'woodpecker_cavities' },
  { key: 'wp_flute', group: 'woodpecker_cavities' },
  { key: 'rot_base', group: 'rot_holes' },
  { key: 'rot_trunk', group: 'rot_holes' },
  { key: 'rot_semiopen', group: 'rot_holes' },
  { key: 'rot_chimney_base', group: 'rot_holes' },
  { key: 'rot_chimney_trunk', group: 'rot_holes' },
  { key: 'rot_hollow_branch', group: 'rot_holes' },
  { key: 'insect_galleries', group: 'insect_galleries' },
  { key: 'dendrotelm', group: 'concavities' },
  { key: 'wp_foraging', group: 'concavities' },
  { key: 'concavity_bark', group: 'concavities' },
  { key: 'concavity_buttress', group: 'concavities' },
  { key: 'bark_loss', group: 'exposed_sapwood' },
  { key: 'fire_scar', group: 'exposed_sapwood' },
  { key: 'bark_shelter', group: 'exposed_sapwood' },
  { key: 'bark_pocket', group: 'exposed_sapwood' },
  { key: 'stem_breakage', group: 'exposed_heartwood' },
  { key: 'limb_breakage', group: 'exposed_heartwood' },
  { key: 'crack', group: 'exposed_heartwood' },
  { key: 'lightning_scar', group: 'exposed_heartwood' },
  { key: 'fork_split', group: 'exposed_heartwood' },
  { key: 'dead_branches', group: 'crown_deadwood' },
  { key: 'dead_top', group: 'crown_deadwood' },
  { key: 'broken_limb_stub', group: 'crown_deadwood' },
  { key: 'witches_broom', group: 'twig_tangles' },
  { key: 'epicormic_shoots', group: 'twig_tangles' },
  { key: 'burr', group: 'burrs_cankers' },
  { key: 'canker', group: 'burrs_cankers' },
  { key: 'polypore_perennial', group: 'perennial_fungi' },
  { key: 'polypore_annual', group: 'ephemeral_fungi' },
  { key: 'pulpy_agaric', group: 'ephemeral_fungi' },
  { key: 'pyrenomycete', group: 'ephemeral_fungi' },
  { key: 'myxomycetes', group: 'ephemeral_fungi' },
  { key: 'bryophytes', group: 'epiphytes_parasites' },
  { key: 'lichens', group: 'epiphytes_parasites' },
  { key: 'ivy_lianas', group: 'epiphytes_parasites' },
  { key: 'ferns', group: 'epiphytes_parasites' },
  { key: 'mistletoe', group: 'epiphytes_parasites' },
  { key: 'nest_vertebrate', group: 'nests' },
  { key: 'nest_invertebrate', group: 'nests' },
  { key: 'microsoil_bark', group: 'microsoil' },
  { key: 'microsoil_crown', group: 'microsoil' },
  { key: 'sap_run', group: 'fresh_exudates' },
  { key: 'resinosis', group: 'fresh_exudates' },
];

export const typesOfGroup = (group) => TREM_TYPES.filter((t) => t.group === group).map((t) => t.key);

/** Gruppen aus gewählten Typen ableiten (ein Baum mit Typ X trägt automatisch dessen Gruppe). */
export function groupsFromTypes(types, extraGroups = []) {
  const set = new Set(extraGroups);
  for (const k of types) { const t = TREM_TYPES.find((x) => x.key === k); if (t) set.add(t.group); }
  return TREM_GROUPS.filter((g) => set.has(g));
}

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
