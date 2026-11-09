/** QR-Plakette scannen → Baum öffnen. Nutzt BarcodeDetector (Android/Chrome), sonst jsQR. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18n.jsx';
import { parseTreeId } from '../lib/qr.js';
import { Notice, PageHeader } from '../components/ui.jsx';

export default function Scan() {
  const { t } = useI18n();
  const nav = useNavigate();
  const video = useRef(null);
  const [err, setErr] = useState(null);
  const [seen, setSeen] = useState(null);

  useEffect(() => {
    let stream, timer, stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const v = video.current; v.srcObject = stream; await v.play();
        const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
        const jsQR = detector ? null : (await import('jsqr')).default;
        const canvas = document.createElement('canvas');
        const tick = async () => {
          if (stopped) return;
          if (v.videoWidth) {
            let text = null;
            if (detector) { const codes = await detector.detect(v); text = codes[0]?.rawValue || null; }
            else {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(v, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsQR(img.data, img.width, img.height)?.data || null;
            }
            if (text) {
              const id = parseTreeId(text);
              if (id) { nav(`/baum/${id}`); return; }
              setSeen(text);
            }
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch { setErr(t('cam.denied')); }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((tr) => tr.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <PageHeader title={t('scan.title')} back />
      <p className="muted">{t('scan.hint')}</p>
      <div className="camera-live"><video ref={video} playsInline muted /></div>
      {err && <Notice kind="error">{err}</Notice>}
      {seen && <Notice kind="warn">{t('scan.notTree')}</Notice>}
    </div>
  );
}
