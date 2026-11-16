import { describe, expect, it } from 'vitest';
import { CHECKLISTS, checklistForProfile, sectionKey, allItems, inspectionSummary, sampleSize, drawSample, verifySample, deviationStatus, groupSummary, effectiveRisk, addDays, itemKey } from '../lib/group.js';

const P = (id, risk = 'normal', extra = {}) => ({ id, kind: 'participant', createdAt: '2026-11-01T10:00:00Z', data: { name: id, risk, areaHa: 10, ...extra } });

describe('Checkliste PEFC D 1002-1:2020', () => {
  it('enthält alle Prüfpunkte 0.1 bis 6.11 plus Teilnahmepflichten', () => {
    const items = allItems('PEFC_DE_2020');
    expect(items).toHaveLength(49);
    expect(items).toContain('4.11');
    expect(items).toContain('6.11');
    expect(new Set(items).size).toBe(items.length);
    for (const f of CHECKLISTS.PEFC_DE_2020.field) expect(items).toContain(f);
  });
  it('baut stabile Übersetzungsschlüssel', () => {
    expect(itemKey('PEFC_DE_2020', '4.10')).toBe('chk.de.4_10');
    expect(itemKey('PEFC_DE_2020', 'T.a')).toBe('chk.de.T_a');
  });
  it('internationaler Benchmark PEFC ST 1003:2024: 48 Anforderungen aus Abschnitt 8 + 10 aus 4.3/6.3', () => {
    const items = allItems('PEFC_INT_2024');
    expect(items).toHaveLength(58);
    expect(items.filter((i) => i.startsWith('8.'))).toHaveLength(48);
    expect(new Set(items).size).toBe(58);
    for (const f of CHECKLISTS.PEFC_INT_2024.field) expect(items).toContain(f);
    expect(itemKey('PEFC_INT_2024', '6.3.4.2')).toBe('chk.int.6_3_4_2');
    expect(sectionKey('PEFC_INT_2024', '8.4')).toBe('chk.int.sec.8_4');
    expect(sectionKey('PEFC_DE_2020', 'T')).toBe('chk.de.sec.T');
  });
  it('Checkliste passend zum Länderprofil', () => {
    expect(checklistForProfile('DE')).toBe('PEFC_DE_2020');
    expect(checklistForProfile('DE_KWM')).toBe('PEFC_DE_2020');
    expect(checklistForProfile('INT')).toBe('PEFC_INT_2024');
  });
  it('zählt Antworten', () => {
    const s = inspectionSummary('PEFC_DE_2020', { '0.1': 'ok', '1.1': 'nc', '6.2': 'na' });
    expect(s).toMatchObject({ ok: 1, nc: 1, na: 1, open: 46, complete: false });
  });
});

describe('Stichprobe', () => {
  it('Quadratwurzel-Regel', () => {
    expect(sampleSize(0)).toBe(0);
    expect(sampleSize(1)).toBe(1);
    expect(sampleSize(10)).toBe(4);
    expect(sampleSize(100)).toBe(10);
    expect(sampleSize(100, 0.6)).toBe(6);
  });
  const parts = Array.from({ length: 25 }, (_, i) => ({ id: `p${String(i).padStart(2, '0')}`, risk: i < 2 ? 'high' : i < 10 ? 'low' : 'normal' }));
  it('ist reproduzierbar und enthält immer alle mit hohem Risiko', () => {
    const a = drawSample(parts, 'seed-1');
    const b = drawSample([...parts].reverse(), 'seed-1');
    expect(a.selected).toEqual(b.selected);
    expect(a.selected).toHaveLength(5);
    expect(a.selected).toEqual(expect.arrayContaining(['p00', 'p01']));
    expect(new Set(a.selected).size).toBe(5);
  });
  it('anderer Startwert → in der Regel andere Auswahl', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((s) => drawSample(parts, s).selected.join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
  it('Auditor kann die Ziehung nachrechnen – und erkennt Manipulation', () => {
    const d = drawSample(parts, 'x');
    const rec = { data: { seed: 'x', selected: d.selected } };
    expect(verifySample(rec, parts)).toBe(true);
    expect(verifySample({ data: { seed: 'x', selected: [...d.selected.slice(0, -1), 'p24'] } }, parts)).toBe(d.selected.at(-1) === 'p24');
  });
  it('mehr Hochrisiko als Stichprobe → alle Hochrisiko', () => {
    const many = Array.from({ length: 4 }, (_, i) => ({ id: `h${i}`, risk: 'high' }));
    expect(drawSample(many, 's').selected).toHaveLength(4);
  });
  it('gewichtet: normal wird häufiger gezogen als niedrig', () => {
    const pop = Array.from({ length: 16 }, (_, i) => ({ id: `q${String(i).padStart(2, '0')}`, risk: i < 8 ? 'low' : 'normal' }));
    let normal = 0, low = 0;
    for (let s = 0; s < 400; s++) for (const id of drawSample(pop, `s${s}`).selected) (Number(id.slice(1)) < 8 ? low++ : normal++);
    expect(normal).toBeGreaterThan(low * 1.3);
  });
  it('offene schwere Abweichung stuft Risiko hoch', () => {
    const p = P('p1', 'low');
    expect(effectiveRisk(p, [])).toBe('low');
    expect(effectiveRisk(p, [{ data: { participantId: 'p1', severity: 'minor' } }])).toBe('normal');
    expect(effectiveRisk(p, [{ data: { participantId: 'p1', severity: 'major' } }])).toBe('high');
  });
});

describe('Abweichungen', () => {
  const recs = [
    P('p1'), P('p2', 'high', { areaHa: 5.5 }),
    { id: 'i1', kind: 'inspection', createdAt: '2026-11-02T10:00:00Z', data: { participantId: 'p1', answers: {} } },
    { id: 'd1', kind: 'deviation', createdAt: '2026-11-02T10:00:00Z', data: { participantId: 'p1', severity: 'major', due: '2026-11-10' } },
    { id: 'd2', kind: 'deviation', createdAt: '2026-11-02T10:00:00Z', data: { participantId: 'p1', severity: 'minor', due: '2027-02-01' } },
    { id: 'd3', kind: 'deviation', createdAt: '2026-11-02T10:00:00Z', data: { participantId: 'p2', severity: 'minor', due: '2026-11-05' } },
    { id: 'c3', kind: 'deviation_closed', createdAt: '2026-11-04T10:00:00Z', data: { deviationId: 'd3' } },
  ];
  it('erkennt offen / überfällig / erledigt', () => {
    const st = deviationStatus(recs, '2026-11-14');
    expect(st.map((x) => [x.deviation.id, x.state])).toEqual([['d1', 'overdue'], ['d2', 'open'], ['d3', 'closed']]);
  });
  it('Gruppenkennzahlen', () => {
    const s = groupSummary(recs, '2026-11-14');
    expect(s).toMatchObject({ participants: 2, areaHa: 15.5, inspections: 1, inspectedParticipants: 1, open: 1, overdue: 1, closed: 1, major: 1 });
  });
  it('Fristen', () => {
    expect(addDays('2026-11-14', 30)).toBe('2026-12-14');
    expect(addDays('2026-11-14T23:00:00Z', 90)).toBe('2027-02-12');
  });
});
