import { useState } from 'react';
import { useI18n } from '../i18n/i18n.jsx';
import { getBestPosition } from '../lib/media.js';
import { Notice } from './ui.jsx';

/** Standort bestimmen (bester GPS-Fix). value/onChange: {lat,lng,accuracy,timestamp} */
export default function PositionPicker({ value, onChange }) {
  const { t, num } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const get = async () => {
    setBusy(true); setErr(false);
    try { onChange(await getBestPosition()); } catch { setErr(true); } finally { setBusy(false); }
  };
  return (
    <div className="pos">
      <div className="pos-row">
        <button type="button" className="btn" onClick={get} disabled={busy}>{busy ? t('pos.getting') : t('pos.get')}</button>
        <span className="pos-value">
          {value ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)} · ${t('pos.accuracy', { m: num(value.accuracy, 0) })}` : t('pos.none')}
        </span>
      </div>
      {err && <Notice kind="error">{t('pos.error')}</Notice>}
    </div>
  );
}
