/**
 * Kamera der App: Fotos entstehen direkt aus dem Videostrom (keine Galerie) → Quelle "camera".
 * Datei-Import ist möglich, wird aber als Quelle "file" markiert und erreicht nur Stufe C.
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { sharpnessFromCanvas, bytesToObjectUrl } from '../lib/media.js';
import { Notice } from './ui.jsx';

const MIN_SHARPNESS = 40;

export default function Camera({ photos, onChange, max = 6 }) {
  const { t } = useI18n();
  const video = useRef(null);
  const stream = useRef(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);

  const stop = () => { stream.current?.getTracks().forEach((tr) => tr.stop()); stream.current = null; setOpen(false); };
  useEffect(() => stop, []);
  // Stream erst verbinden, wenn das <video>-Element sicher im DOM ist
  useEffect(() => {
    if (open && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [open]);

  const start = async () => {
    setMsg(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
      setOpen(true);
    } catch { setMsg({ kind: 'error', text: t('cam.denied') }); }
  };

  const shoot = async () => {
    const v = video.current;
    if (!v) return;
    // Videostrom kann kurz nach dem Öffnen noch ohne Bild sein → bis zu 3 s warten
    for (let i = 0; i < 30 && !v.videoWidth; i++) await new Promise((r) => setTimeout(r, 100));
    if (!v.videoWidth) { setMsg({ kind: 'error', text: t('cam.denied') }); return; }
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const sharpness = sharpnessFromCanvas(c);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (sharpness < MIN_SHARPNESS) setMsg({ kind: 'warn', text: t('cam.blurry') });
    else setMsg({ kind: 'info', text: t('cam.sharp', { s: sharpness }) });
    onChange([...photos, { bytes, type: 'image/jpeg', source: 'camera', sharpness }].slice(0, max));
  };

  const fromFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    onChange([...photos, { bytes, type: f.type || 'image/jpeg', source: 'file' }].slice(0, max));
    e.target.value = '';
  };

  return (
    <div className="camera">
      {open ? (
        <div className="camera-live">
          <video ref={video} playsInline muted />
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={shoot}>{t('cam.shoot')}</button>
            <button type="button" className="btn" onClick={stop}>{t('cam.close')}</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={start} disabled={photos.length >= max}>{t('cam.open')}</button>
          <label className="btn btn-quiet">
            {t('cam.file')}
            <input type="file" accept="image/*" hidden onChange={fromFile} />
          </label>
        </div>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {photos.length > 0 && (
        <ul className="thumbs">
          {photos.map((p, i) => (
            <li key={i}>
              <img src={bytesToObjectUrl(p.bytes, p.type)} alt="" />
              {p.source === 'file' && <span className="thumb-tag">{t('cam.fromFile')}</span>}
              <button type="button" className="thumb-del" aria-label={t('common.delete')} onClick={() => onChange(photos.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
