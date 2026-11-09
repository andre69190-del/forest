/**
 * BIOGLOW Forest – Geodaten-Logik (ohne DOM, voll getestet in src/test/geo.test.js).
 *
 * - Flächenberechnung auf der Kugel (gleiche Formel wie turf/Google, Fehler < 0,5 % für Waldparzellen)
 * - GPS-Mittelung pro Eckpunkt (gewichtet nach 1/Genauigkeit²)
 * - Polygon-Prüfung nach den Regeln des EU-Informationssystems (EUDR):
 *   ≥ 4 Koordinatenpaare, geschlossener Ring, keine Selbstüberschneidung,
 *   keine Duplikate nach Rundung auf 6 Nachkommastellen, nicht alle Punkte auf einer Linie
 * - EUDR-GeoJSON: Punkt bis 4 ha, Polygon darüber; Reihenfolge [Länge, Breite]
 *
 * Quelle der Regeln: EU-Informationssystem, „GeoJSON file description" (docs/QUELLEN.md).
 */

export const EARTH_RADIUS_M = 6378137;
export const EUDR_POINT_MAX_HA = 4;
export const EUDR_DECIMALS = 6;

const rad = (d) => (d * Math.PI) / 180;

/** Rundet auf die vom EU-System verwendeten 6 Nachkommastellen. */
export function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}

/** Entfernt einen schließenden Punkt, falls der Ring schon geschlossen ist. */
export function openRing(points) {
  if (points.length > 1) {
    const a = points[0], b = points[points.length - 1];
    if (a.lat === b.lat && a.lng === b.lng) return points.slice(0, -1);
  }
  return points.slice();
}

/** Fläche eines Polygons in m² (Punkte {lat,lng}, offen oder geschlossen). */
export function polygonAreaM2(points) {
  const p = openRing(points);
  if (p.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p.at((i + 1) % p.length);
    sum += rad(b.lng - a.lng) * (2 + Math.sin(rad(a.lat)) + Math.sin(rad(b.lat)));
  }
  return Math.abs((sum * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export const m2ToHa = (m2) => m2 / 10000;

/** Abstand zweier Punkte in Metern (Haversine). */
export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Umfang in Metern (geschlossen). */
export function perimeterM(points) {
  const p = openRing(points);
  if (p.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < p.length; i++) s += distanceM(p[i], p.at((i + 1) % p.length));
  return s;
}

/** Schwerpunkt (einfaches Mittel, für Punkt-Geolokalisierung kleiner Flächen ausreichend). */
export function centroid(points) {
  const p = openRing(points);
  if (!p.length) return null;
  const lat = p.reduce((s, q) => s + q.lat, 0) / p.length;
  const lng = p.reduce((s, q) => s + q.lng, 0) / p.length;
  return { lat, lng };
}

/**
 * Mittelt GPS-Messungen eines Eckpunkts. samples: [{lat,lng,accuracy}]
 * Messungen schlechter als maxAccuracyM werden verworfen.
 * Ergebnis: {lat,lng,accuracy,n} – accuracy ≈ Genauigkeit des gewichteten Mittels.
 */
export function averageFixes(samples, maxAccuracyM = 30) {
  const good = samples.filter((s) => Number.isFinite(s.accuracy) && s.accuracy > 0 && s.accuracy <= maxAccuracyM);
  if (!good.length) return null;
  let w = 0, lat = 0, lng = 0;
  for (const s of good) {
    const wi = 1 / (s.accuracy * s.accuracy);
    w += wi; lat += s.lat * wi; lng += s.lng * wi;
  }
  return { lat: lat / w, lng: lng / w, accuracy: Math.sqrt(1 / w), n: good.length };
}

function orient(a, b, c) {
  const v = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
  return Math.abs(v) < 1e-15 ? 0 : v > 0 ? 1 : -1;
}
function onSeg(a, b, c) {
  return Math.min(a.lng, c.lng) <= b.lng && b.lng <= Math.max(a.lng, c.lng) &&
    Math.min(a.lat, c.lat) <= b.lat && b.lat <= Math.max(a.lat, c.lat);
}
function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orient(p1, p2, p3), o2 = orient(p1, p2, p4), o3 = orient(p3, p4, p1), o4 = orient(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(p1, p3, p2)) return true;
  if (o2 === 0 && onSeg(p1, p4, p2)) return true;
  if (o3 === 0 && onSeg(p3, p1, p4)) return true;
  if (o4 === 0 && onSeg(p3, p2, p4)) return true;
  return false;
}

/** true, wenn sich zwei nicht benachbarte Kanten schneiden (Achter-Form). */
export function selfIntersects(points) {
  const p = openRing(points);
  const n = p.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = p[i], a2 = p.at((i + 1) % n);
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      const b1 = p[j], b2 = p.at((j + 1) % n);
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Prüft ein Polygon nach den EUDR-Regeln.
 * Rückgabe: { ok, issues: [code], areaHa, needsPolygon }
 * Codes: too_few_points, duplicate_after_rounding, self_intersection, collinear, out_of_range
 */
export function validatePolygon(points) {
  const issues = [];
  const p = openRing(points);
  if (p.some((q) => Math.abs(q.lat) > 90 || Math.abs(q.lng) > 180)) issues.push('out_of_range');
  if (p.length < 3) issues.push('too_few_points');
  const keys = p.map((q) => `${round6(q.lat)},${round6(q.lng)}`);
  if (new Set(keys).size !== keys.length) issues.push('duplicate_after_rounding');
  if (p.length >= 4 && selfIntersects(p)) issues.push('self_intersection');
  const areaM2 = polygonAreaM2(p);
  if (p.length >= 3 && areaM2 < 1) issues.push('collinear');
  const areaHa = m2ToHa(areaM2);
  return { ok: issues.length === 0, issues, areaHa, needsPolygon: areaHa > EUDR_POINT_MAX_HA };
}

/**
 * Baut ein EUDR-GeoJSON (Typ I: ein Erzeuger) für eine oder mehrere Flächen.
 * plots: [{ name, points:[{lat,lng}] }]; producer: { name?, country? (ISO2) }
 * Flächen ≤ 4 ha werden als Punkt (Schwerpunkt) mit Area geliefert, größere als Polygon.
 * forcePolygon=true liefert immer Polygone (zulässig, oft genauer).
 */
export function toEudrGeoJSON(plots, producer = {}, { forcePolygon = false } = {}) {
  const features = plots.map((plot) => {
    const v = validatePolygon(plot.points);
    if (!v.ok) {
      const err = new Error(`Fläche „${plot.name}" ist ungültig: ${v.issues.join(', ')}`);
      err.issues = v.issues;
      throw err;
    }
    const props = {};
    if (producer.name) props.ProducerName = producer.name;
    if (producer.country) props.ProducerCountry = producer.country.toUpperCase();
    if (plot.name) props.ProductionPlace = plot.name;
    let geometry;
    if (v.needsPolygon || forcePolygon) {
      const ring = openRing(plot.points).map((q) => [round6(q.lng), round6(q.lat)]);
      ring.push(ring[0].slice());
      geometry = { type: 'Polygon', coordinates: [ring] };
    } else {
      const c = centroid(plot.points);
      geometry = { type: 'Point', coordinates: [round6(c.lng), round6(c.lat)] };
      props.Area = Math.round(v.areaHa * 10000) / 10000; // Zahl, nie String (String wird als 0 gelesen)
    }
    return { type: 'Feature', properties: props, geometry };
  });
  return { type: 'FeatureCollection', features };
}
