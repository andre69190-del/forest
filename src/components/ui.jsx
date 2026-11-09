/** Kleine, wiederverwendbare Oberflächen-Bausteine. */
import { useI18n } from '../i18n/i18n.jsx';

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Card({ title, children, actions }) {
  return (
    <section className="card">
      {title && <h2 className="card-title">{title}</h2>}
      {children}
      {actions && <div className="card-actions">{actions}</div>}
    </section>
  );
}

export function Notice({ kind = 'info', children }) {
  return <p className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export function TrustBadge({ level }) {
  const { t } = useI18n();
  const l = level || 'unknown';
  return <span className={`badge badge-${l}`}>{t(`ev.level.${l}`)}</span>;
}

export function PageHeader({ title, back }) {
  const { t } = useI18n();
  return (
    <header className="page-header">
      {back && <button type="button" className="btn-link" onClick={() => history.back()}>← {t('common.back')}</button>}
      <h1>{title}</h1>
    </header>
  );
}

/** Löst einen Datei-Download im Browser aus. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
