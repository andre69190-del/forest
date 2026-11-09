import { useI18n } from '../i18n/i18n.jsx';
import { TREM_FORMS } from '../lib/forestry.js';

/** Auswahl der Mikrohabitat-Gruppen, gegliedert nach den 7 Formen. */
export default function TremPicker({ value, onChange }) {
  const { t } = useI18n();
  const toggle = (g) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <div className="trems">
      {TREM_FORMS.map((f) => (
        <fieldset key={f.key} className="trem-form">
          <legend>{t(`trem.form.${f.key}`)}</legend>
          {f.groups.map((g) => (
            <label key={g} className="check">
              <input type="checkbox" checked={value.includes(g)} onChange={() => toggle(g)} />
              <span>{t(`trem.${g}`)}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
