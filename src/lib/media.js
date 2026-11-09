/**
 * BIOGLOW Forest – Foto-Helfer: Schärfe (Laplace-Varianz, Muster aus BIOGLOW) und Standort.
 */

/** Schärfe-Wert 0–100 aus einem Canvas-Bild (verkleinert auf max. 320 px). */
export function sharpnessFromCanvas(srcCanvas) {
  const scale = Math.min(1, 320 / Math.max(srcCanvas.width, srcCanvas.height));
  const w = Math.max(3, Math.round(srcCanvas.width * scale)), h = Math.max(3, Math.round(srcCanvas.height * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    sum += lap; sum2 += lap * lap; n++;
  }
  const variance = n ? sum2 / n - (sum / n) ** 2 : 0;
  return Math.max(0, Math.min(100, Math.round(Math.sqrt(variance) * 4)));
}

/**
 * Bester GPS-Fix innerhalb maxWaitMs (Muster aus BIOGLOW: watchPosition, beste Genauigkeit gewinnt).
 * Rückgabe: {lat,lng,accuracy,altitude,timestamp}
 */
export function getBestPosition({ maxWaitMs = 12000, goodEnoughM = 8 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('no_geolocation')); return; }
    let best = null, wid = null;
    const finish = () => {
      if (wid !== null) navigator.geolocation.clearWatch(wid);
      if (best) resolve(toPos(best)); else reject(new Error('no_fix'));
    };
    const t = setTimeout(finish, maxWaitMs);
    wid = navigator.geolocation.watchPosition(
      (p) => {
        if (!best || p.coords.accuracy < best.coords.accuracy) best = p;
        if (p.coords.accuracy <= goodEnoughM) { clearTimeout(t); finish(); }
      },
      (e) => { if (!best) { clearTimeout(t); if (wid !== null) navigator.geolocation.clearWatch(wid); reject(e); } },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
  });
}

export function toPos(p) {
  return {
    lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy * 10) / 10,
    altitude: p.coords.altitude ?? null, timestamp: p.timestamp,
  };
}

export function bytesToObjectUrl(bytes, type = 'image/jpeg') {
  return URL.createObjectURL(new Blob([bytes], { type }));
}
