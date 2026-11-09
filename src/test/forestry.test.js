import { describe, it, expect } from 'vitest';
import { TREM_FORMS, TREM_GROUPS, formOfGroup, lineIntersectVolume, standingVolume, habitatTreeStatus, PROFILES } from '../lib/forestry.js';

describe('Mikrohabitat-Katalog', () => {
  it('7 Formen, 15 Gruppen, eindeutig', () => {
    expect(TREM_FORMS.length).toBe(7);
    expect(TREM_GROUPS.length).toBe(15);
    expect(new Set(TREM_GROUPS).size).toBe(15);
    expect(formOfGroup('nests')).toBe('epiphytes');
  });
});

describe('Totholz', () => {
  it('Van Wagner: ein 20-cm-Stück auf 100 m Linie ≈ 4,93 m³/ha', () => {
    expect(lineIntersectVolume([20], 100)).toBeCloseTo((Math.PI ** 2 * 400) / 800, 6);
    expect(lineIntersectVolume([20], 100)).toBeCloseTo(4.935, 2);
  });
  it('Stücke unter 10 cm zählen nicht; Linie 0 → 0', () => {
    expect(lineIntersectVolume([5, 8], 100)).toBe(0);
    expect(lineIntersectVolume([30], 0)).toBe(0);
  });
  it('stehender Stamm 40 cm × 20 m ≈ 1,26 m³', () => {
    expect(standingVolume(40, 20)).toBeCloseTo(1.2566, 3);
  });
});

describe('Länderprofil', () => {
  const trees = [
    { bhdCm: 45, trems: ['rot_holes'] }, { bhdCm: 25, trems: ['nests'] }, { bhdCm: 50, trems: [] },
  ];
  it('KWM: nur Bäume ab 30 cm BHD mit Mikrohabitat zählen', () => {
    const s = habitatTreeStatus(trees, 0.1, PROFILES.DE_KWM);
    expect(s.perHa).toBeCloseTo(10, 6);
    expect(s.status).toBe('ok');
  });
  it('PEFC DE ohne Zahl → kein Zielwert', () => {
    expect(habitatTreeStatus(trees, 1, PROFILES.DE).status).toBe('none');
  });
});

import { TREM_TYPES, typesOfGroup, groupsFromTypes } from '../lib/forestry.js';
describe('47 Mikrohabitat-Typen', () => {
  it('47 eindeutige Typen, jede der 15 Gruppen hat mindestens einen', () => {
    expect(TREM_TYPES.length).toBe(47);
    expect(new Set(TREM_TYPES.map((x) => x.key)).size).toBe(47);
    for (const g of TREM_GROUPS) expect(typesOfGroup(g).length).toBeGreaterThan(0);
  });
  it('Gruppen ergeben sich aus Typen, in Katalog-Reihenfolge', () => {
    expect(groupsFromTypes(['resinosis', 'wp_flute'])).toEqual(['woodpecker_cavities', 'fresh_exudates']);
  });
});

import { pdfSafe } from '../lib/pdf.js';
describe('PDF-Text', () => {
  it('ersetzt Zeichen, die die PDF-Standardschrift nicht kennt', () => {
    expect(pdfSafe('Mehr → „Paket prüfen“ – ø ≥ 3 …')).toBe('Mehr -> "Paket prüfen" - Ø >= 3 ...');
  });
});
