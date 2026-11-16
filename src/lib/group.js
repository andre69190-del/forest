/**
 * BIOGLOW Forest – Gruppenzertifizierung (Phase 2): Checklisten, risikobasierte Stichprobe, Abweichungen.
 * Reine Logik ohne Datenbank → vollständig testbar (src/test/group.test.js).
 *
 * Nachweis-Arten (alle signiert, unveränderlich, Korrektur nur per "supersedes"):
 *   participant       { name, areaHa, region, risk: low|normal|high, contact }
 *   sample            { seed, checklist, size, rule, selected: [participantId], population: n }
 *   inspection        { participantId, checklist, answers: { itemId: ok|nc|na }, notes: { itemId: text }, inspector, sampleId }
 *   deviation         { inspectionId, participantId, checklist, item, severity: minor|major, finding, action, due }
 *   deviation_closed  { deviationId, note }
 */

/**
 * PEFC Deutschland – Standards für nachhaltige Waldbewirtschaftung, PEFC D 1002-1:2020.
 * Die Prüfpunkte tragen die Nummern des Standards; die Texte stehen gekürzt in der Übersetzung
 * (chk.de.<nummer>). Maßgeblich ist immer der Originaltext des Standards.
 * "T.*" = Verpflichtungen der Teilnehmer an der regionalen Gruppenzertifizierung (Abschnitt Teilnahme).
 */
export const CHECKLISTS = {
  PEFC_DE_2020: {
    id: 'PEFC_DE_2020',
    code: 'PEFC D 1002-1:2020',
    source: 'https://www.landesforsten.de/wp-content/uploads/2021/11/pefc-standards_grafikversion_online_stand082021.pdf',
    sections: [
      { key: 'T', items: ['T.a', 'T.b', 'T.c', 'T.d'] },
      { key: '0', items: ['0.1'] },
      { key: '1', items: ['1.1', '1.2', '1.3'] },
      { key: '2', items: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8'] },
      { key: '3', items: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6'] },
      { key: '4', items: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10', '4.11'] },
      { key: '5', items: ['5.1', '5.2', '5.3', '5.4', '5.5'] },
      { key: '6', items: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9', '6.10', '6.11'] },
    ],
    // Prüfpunkte, die vor Ort im Wald sichtbar sind (Schnellprüfung bei Waldbegang)
    field: ['1.2', '2.5', '2.6', '2.7', '2.8', '3.4', '4.1', '4.3', '4.5', '4.10', '4.11', '5.2', '5.3', '5.4', '5.5', '6.6', '6.11'],
    prefix: 'de',
    country: 'DE',
  },
  /**
   * PEFC ST 1003:2024 – internationaler Benchmark (Grundlage aller nationalen PEFC-Standards, EUDR-angepasst).
   * Zertifiziert wird immer nach dem nationalen Standard; diese Liste dient als Orientierung überall dort,
   * wo die App noch keine nationale Checkliste hat. "A" = Rechtmäßigkeit, Rechte, Arbeit, Geodaten (Abschnitte 4.3/6.3).
   */
  PEFC_INT_2024: {
    id: 'PEFC_INT_2024',
    code: 'PEFC ST 1003:2024',
    source: 'https://cdn.pefc.org/pefc.org/media/2024-12/cb77aabf-85fd-4003-9b29-326aaf70a28e/ab2a4cfe-c7ba-5f2f-bbcc-f0452a5ed63c.pdf',
    sections: [
      { key: 'A', items: ['4.3.3', '6.3.1.2', '6.3.1.4', '6.3.2.1', '6.3.2.2', '6.3.3.1', '6.3.4.1', '6.3.4.2', '6.3.4.3', '6.3.4.4'] },
      { key: '8.1', items: ['8.1.1', '8.1.2', '8.1.3', '8.1.4', '8.1.5', '8.1.6', '8.1.7'] },
      { key: '8.2', items: ['8.2.1', '8.2.2', '8.2.3', '8.2.4', '8.2.5', '8.2.6', '8.2.7', '8.2.8', '8.2.9', '8.2.10', '8.2.11'] },
      { key: '8.3', items: ['8.3.1', '8.3.2', '8.3.3', '8.3.4', '8.3.5'] },
      { key: '8.4', items: ['8.4.1', '8.4.2', '8.4.3', '8.4.4', '8.4.5', '8.4.6', '8.4.7', '8.4.8', '8.4.9', '8.4.10', '8.4.11', '8.4.12', '8.4.13'] },
      { key: '8.5', items: ['8.5.1', '8.5.2', '8.5.3', '8.5.4', '8.5.5'] },
      { key: '8.6', items: ['8.6.1', '8.6.2', '8.6.3', '8.6.4', '8.6.5', '8.6.6', '8.6.7'] },
    ],
    field: ['6.3.4.2', '8.1.4', '8.1.6', '8.2.3', '8.2.5', '8.3.3', '8.4.2', '8.4.4', '8.4.8', '8.4.10', '8.4.12', '8.4.13', '8.5.3', '8.5.4', '8.5.5', '8.6.2', '8.6.3'],
    prefix: 'int',
    benchmark: true,
  },
};

/** Passende Checkliste zum Länderprofil der Einstellungen. */
export const checklistForProfile = (profile) => (profile === 'DE' || profile === 'DE_KWM' ? 'PEFC_DE_2020' : 'PEFC_INT_2024');

export const ANSWERS = ['ok', 'nc', 'na'];
export const SEVERITIES = ['minor', 'major'];
export const RISKS = ['low', 'normal', 'high'];
/** Vorschlag für Fristen in Tagen – die Gruppe kann sie je Abweichung ändern. */
export const DEFAULT_DUE_DAYS = { minor: 90, major: 30 };

const prefixOf = (checklist) => CHECKLISTS[checklist]?.prefix || checklist;
export const itemKey = (checklist, item) => `chk.${prefixOf(checklist)}.${item.replace(/\./g, '_')}`;
export const sectionKey = (checklist, sec) => `chk.${prefixOf(checklist)}.sec.${sec.replace(/\./g, '_')}`;
export const allItems = (checklist) => (CHECKLISTS[checklist]?.sections || []).flatMap((s) => s.items);

/** Ergebnis einer Prüfung: Anzahl erfüllt / nicht erfüllt / nicht anwendbar / offen. */
export function inspectionSummary(checklist, answers = {}) {
  const items = allItems(checklist);
  const s = { total: items.length, ok: 0, nc: 0, na: 0, open: 0 };
  for (const i of items) {
    const a = answers[i];
    if (a === 'ok' || a === 'nc' || a === 'na') s[a] += 1; else s.open += 1;
  }
  s.complete = s.open === 0;
  return s;
}

// ---------- Stichprobe ----------

/**
 * Stichprobengröße: aufgerundete Quadratwurzel der Teilnehmerzahl (übliche Regel für Gruppen-
 * und Mehrstandort-Audits, vgl. IAF MD 1). factor < 1 z. B. für Überwachungsaudits (0,6).
 */
export function sampleSize(n, factor = 1) {
  if (!n || n <= 0) return 0;
  return Math.min(n, Math.max(1, Math.ceil(Math.sqrt(n) * factor)));
}

/** FNV-1a 32 bit – kleiner, deterministischer Hash für den Zufalls-Startwert. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** mulberry32 – reproduzierbarer Zufallsgenerator aus einem Startwert. */
export function rng(seed) {
  let a = hash32(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Risiko eines Teilnehmers: eigene Einstufung, hochgestuft durch offene schwere Abweichungen. */
export function effectiveRisk(participant, openDeviations = []) {
  if (openDeviations.some((d) => d.data.participantId === participant.id && d.data.severity === 'major')) return 'high';
  if (openDeviations.some((d) => d.data.participantId === participant.id)) return participant.data.risk === 'low' ? 'normal' : participant.data.risk || 'normal';
  return participant.data.risk || 'normal';
}

/**
 * Zieht die Stichprobe – reproduzierbar: gleiche Teilnehmer + gleicher Startwert = gleiche Auswahl.
 * Regel: alle Teilnehmer mit hohem Risiko sind immer dabei; der Rest wird zufällig ergänzt,
 * Teilnehmer mit normalem Risiko vor solchen mit niedrigem (gewichtete Ziehung).
 * participants: [{ id, risk }] → { size, selected: [id] }
 */
export function drawSample(participants, seed, factor = 1) {
  const sorted = [...participants].sort((a, b) => (a.id < b.id ? -1 : 1));
  const size = sampleSize(sorted.length, factor);
  const high = sorted.filter((p) => p.risk === 'high').map((p) => p.id);
  const rest = sorted.filter((p) => p.risk !== 'high');
  const r = rng(seed);
  // gewichtete Reihenfolge ohne Zurücklegen (Efraimidis–Spirakis): Schlüssel = u^(1/w)
  const weight = { normal: 2, low: 1 };
  const ordered = rest
    .map((p) => ({ id: p.id, k: r() ** (1 / (weight[p.risk] || 2)) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.id);
  const selected = high.length >= size ? high : [...high, ...ordered.slice(0, size - high.length)];
  return { size: Math.max(size, high.length), selected };
}

/** Prüft, ob eine gespeicherte Stichprobe zu Startwert und Teilnehmern passt (für Auditoren). */
export function verifySample(sampleRecord, participantsAtDraw) {
  const d = sampleRecord.data;
  const again = drawSample(participantsAtDraw, d.seed, d.factor || 1);
  return again.selected.length === d.selected.length && again.selected.every((id, i) => id === d.selected[i]);
}

// ---------- Abweichungen ----------

export function addDays(iso, days) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stand aller Abweichungen: open | overdue | closed, sortiert (überfällig zuerst). */
export function deviationStatus(records, today = new Date().toISOString().slice(0, 10)) {
  const closedBy = new Map();
  for (const r of records) if (r.kind === 'deviation_closed') closedBy.set(r.data.deviationId, r);
  const order = { overdue: 0, open: 1, closed: 2 };
  return records
    .filter((r) => r.kind === 'deviation')
    .map((d) => {
      const closed = closedBy.get(d.id) || null;
      const state = closed ? 'closed' : d.data.due && d.data.due < today ? 'overdue' : 'open';
      return { deviation: d, closed, state };
    })
    .sort((a, b) => order[a.state] - order[b.state] || (a.deviation.data.due || '').localeCompare(b.deviation.data.due || ''));
}

/** Kennzahlen der Gruppe für Startseite, Gruppenbericht und Auditor. */
export function groupSummary(records, today) {
  const participants = records.filter((r) => r.kind === 'participant');
  const inspections = records.filter((r) => r.kind === 'inspection');
  const devs = deviationStatus(records, today);
  const inspected = new Set(inspections.map((i) => i.data.participantId));
  const areaHa = participants.reduce((s, p) => s + (Number(p.data.areaHa) || 0), 0);
  const lastSample = records.filter((r) => r.kind === 'sample').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  const sampleDone = lastSample ? lastSample.data.selected.filter((id) => inspections.some((i) => i.data.participantId === id && i.createdAt >= lastSample.createdAt)).length : 0;
  return {
    participants: participants.length, areaHa, inspections: inspections.length, inspectedParticipants: inspected.size,
    open: devs.filter((d) => d.state === 'open').length, overdue: devs.filter((d) => d.state === 'overdue').length,
    closed: devs.filter((d) => d.state === 'closed').length,
    major: devs.filter((d) => d.state !== 'closed' && d.deviation.data.severity === 'major').length,
    lastSample, sampleDone, sampleSize: lastSample ? lastSample.data.selected.length : 0,
  };
}
