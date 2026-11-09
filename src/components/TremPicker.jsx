/**
 * Mikrohabitate wählen – zwei Detailstufen:
 *  groups: 15 Gruppen (schnell, Habitatbaum-Ausweisung)
 *  types:  47 Typen mit Mindestgrößen (Inventur); die Gruppe ergibt sich automatisch aus dem Typ.
 * value = { groups: [...], types: [...] }
 */
import { useI18n } from '../i18n/i18n.jsx';
import { TREM_FORMS, typesOfGroup, groupsFromTypes } from '../lib/forestry.js';

export default function TremPicker({ value, onChange, detail = 'groups' }) {
  const { t } = useI18n();
  const groups = value.groups || [];
  const types = value.types || [];
  const toggleGroup = (g) => onChange({ types, groups: groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g] });
  const toggleType = (k) => {
    const next = types.includes(k) ? types.filter((x) => x !== k) : [...types, k];
    // Gruppen ohne gewählten Typ entfallen im Typ-Modus, manuell gesetzte Gruppen ohne Typen bleiben
    const manual = groups.filter((g) => !typesOfGroup(g).some((x) => types.includes(x)) && !typesOfGroup(g).includes(k));
    onChange({ types: next, groups: groupsFromTypes(next, manual) });
  };
  return (
    <div className="trems">
      {TREM_FORMS.map((f) => (
        <fieldset key={f.key} className="trem-form">
          <legend>{t(`trem.form.${f.key}`)}</legend>
          {f.groups.map((g) => (detail === 'types' ? (
            <details key={g} className="trem-group" open={typesOfGroup(g).some((k) => types.includes(k))}>
              <summary>
                <span>{t(`trem.${g}`)}</span>
                {typesOfGroup(g).filter((k) => types.includes(k)).length > 0 && (
                  <span className="count-badge">{t('trem.selected', { n: typesOfGroup(g).filter((k) => types.includes(k)).length })}</span>
                )}
              </summary>
              {typesOfGroup(g).map((k) => (
                <label key={k} className="check check-type">
                  <input type="checkbox" checked={types.includes(k)} onChange={() => toggleType(k)} />
                  <span>{t(`trem.t.${k}`)}<small>{t(`trem.min.${k}`)}</small></span>
                </label>
              ))}
            </details>
          ) : (
            <label key={g} className="check">
              <input type="checkbox" checked={groups.includes(g)} onChange={() => toggleGroup(g)} />
              <span>{t(`trem.${g}`)}</span>
            </label>
          )))}
        </fieldset>
      ))}
    </div>
  );
}
