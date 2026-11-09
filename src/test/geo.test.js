import { describe, it, expect } from 'vitest';
import { polygonAreaM2, m2ToHa, validatePolygon, toEudrGeoJSON, averageFixes, selfIntersects, distanceM, round6 } from '../lib/geo.js';

// Quadrat ~100 m × 100 m bei 49,3° N (Walldorf) → ~1 ha
const lat0 = 49.3, lng0 = 8.64;
const dLat = 100 / 111320, dLng = 100 / (111320 * Math.cos((lat0 * Math.PI) / 180));
const square = [
  { lat: lat0, lng: lng0 }, { lat: lat0, lng: lng0 + dLng },
  { lat: lat0 + dLat, lng: lng0 + dLng }, { lat: lat0 + dLat, lng: lng0 },
];
const big = square.map((p) => ({ lat: lat0 + (p.lat - lat0) * 3, lng: lng0 + (p.lng - lng0) * 3 })); // ~9 ha

describe('Fläche', () => {
  it('1-ha-Quadrat ergibt ~1 ha (±1 %)', () => {
    expect(m2ToHa(polygonAreaM2(square))).toBeGreaterThan(0.99);
    expect(m2ToHa(polygonAreaM2(square))).toBeLessThan(1.01);
  });
  it('geschlossener und offener Ring ergeben dieselbe Fläche', () => {
    expect(polygonAreaM2([...square, square[0]])).toBeCloseTo(polygonAreaM2(square), 6);
  });
  it('Abstand 100 m', () => {
    expect(distanceM(square[0], square[1])).toBeGreaterThan(99);
    expect(distanceM(square[0], square[1])).toBeLessThan(101);
  });
});

describe('Polygon-Prüfung (EUDR-Regeln)', () => {
  it('gültiges Quadrat', () => {
    const v = validatePolygon(square);
    expect(v.ok).toBe(true);
    expect(v.needsPolygon).toBe(false);
  });
  it('Achter-Form wird erkannt', () => {
    const bow = [square[0], square[2], square[1], square[3]];
    expect(selfIntersects(bow)).toBe(true);
    expect(validatePolygon(bow).issues).toContain('self_intersection');
  });
  it('zu wenige Punkte', () => {
    expect(validatePolygon(square.slice(0, 2)).issues).toContain('too_few_points');
  });
  it('Duplikat nach Rundung auf 6 Stellen', () => {
    const dup = [...square, { lat: square[0].lat + 1e-8, lng: square[0].lng }];
    expect(validatePolygon(dup).issues).toContain('duplicate_after_rounding');
  });
  it('Punkte auf einer Linie', () => {
    const line = [{ lat: 49, lng: 8 }, { lat: 49.001, lng: 8 }, { lat: 49.002, lng: 8 }];
    expect(validatePolygon(line).issues).toContain('collinear');
  });
});

describe('EUDR-GeoJSON', () => {
  it('≤ 4 ha → Punkt mit Area als Zahl, [lng, lat], 6 Stellen', () => {
    const gj = toEudrGeoJSON([{ name: 'Parzelle 1', points: square }], { country: 'de' });
    const f = gj.features[0];
    expect(f.geometry.type).toBe('Point');
    expect(typeof f.properties.Area).toBe('number');
    expect(f.properties.ProducerCountry).toBe('DE');
    expect(f.geometry.coordinates[0]).toBeCloseTo(lng0 + dLng / 2, 5);
    expect(round6(f.geometry.coordinates[1])).toBe(f.geometry.coordinates[1]);
  });
  it('> 4 ha → geschlossenes Polygon', () => {
    const gj = toEudrGeoJSON([{ name: 'Groß', points: big }]);
    const ring = gj.features[0].geometry.coordinates[0];
    expect(gj.features[0].geometry.type).toBe('Polygon');
    expect(ring.length).toBe(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(gj.features[0].properties.Area).toBeUndefined();
  });
  it('ungültige Fläche wirft mit Codes', () => {
    expect(() => toEudrGeoJSON([{ name: 'x', points: square.slice(0, 2) }])).toThrow();
  });
});

describe('GPS-Mittelung', () => {
  it('gewichtet genaue Messungen stärker und verwirft schlechte', () => {
    const r = averageFixes([
      { lat: 49.0, lng: 8.0, accuracy: 5 },
      { lat: 49.0002, lng: 8.0, accuracy: 20 },
      { lat: 50.0, lng: 9.0, accuracy: 200 },
    ]);
    expect(r.n).toBe(2);
    expect(r.lat).toBeLessThan(49.0001);
    expect(r.accuracy).toBeLessThan(5);
  });
  it('null ohne brauchbare Messung', () => {
    expect(averageFixes([{ lat: 1, lng: 1, accuracy: 500 }])).toBeNull();
  });
});
