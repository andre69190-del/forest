// BIOGLOW Forest — i18n-Check (Muster: Polski Szlak checks/i18n_check.mjs, GeoQuest i18n_test.js)
//  1. Jede Sprache hat exakt dieselben Schlüssel wie de.js
//  2. Jeder t('…')-Schlüssel im Code existiert
//  3. Dynamische Schlüssel (t(`trem.${g}`) usw.) werden aus den Datenlisten erzeugt und geprüft
//  4. Keine leeren Übersetzungen, Platzhalter {x} in allen Sprachen gleich
// Exit 1 bei Lücken.  ->  node checks/i18n_check.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N = join(ROOT, 'src', 'i18n');
const langs = readdirSync(I18N).filter((f) => /^[a-z]{2}\.js$/.test(f)).map((f) => f.slice(0, 2));
const dicts = {};
for (const l of langs) dicts[l] = (await import(join(I18N, `${l}.js`))).default;
const base = dicts.de;
const problems = [];

for (const l of langs) {
  for (const k of Object.keys(base)) {
    if (!(k in dicts[l])) problems.push(`${l}: fehlt ${k}`);
    else if (!String(dicts[l][k]).trim()) problems.push(`${l}: leer ${k}`);
    else {
      const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      if (ph(base[k]) !== ph(dicts[l][k])) problems.push(`${l}: Platzhalter abweichend in ${k}`);
    }
  }
  for (const k of Object.keys(dicts[l])) if (!(k in base)) problems.push(`${l}: überzählig ${k}`);
}

function walk(d) { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
const code = walk(join(ROOT, 'src')).filter((p) => /\.(jsx?|mjs)$/.test(p) && !p.includes(`${'/'}test${'/'}`) && !p.includes('/i18n/'));
const used = new Set();
for (const p of code) for (const m of readFileSync(p, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
// Schlüssel, die als Liste im Code stehen (['about.text1', …])
for (const p of code) for (const m of readFileSync(p, 'utf8').matchAll(/'((?:about|capture|home|info)\.[a-zA-Z0-9.]+)'/g)) used.add(m[1]);

const { TREM_FORMS, TREM_GROUPS, PROFILES, DECAY_CLASSES } = await import(join(ROOT, 'src', 'lib', 'forestry.js'));
const dyn = [
  ...TREM_FORMS.map((f) => `trem.form.${f.key}`), ...TREM_GROUPS.map((g) => `trem.${g}`),
  ...Object.keys(PROFILES).map((k) => `profile.${k}`), ...DECAY_CLASSES.map((c) => `dw.decay.${c}`),
  ...['home', 'plots', 'capture', 'evidence', 'more'].map((k) => `nav.${k}`),
  ...['plots', 'trees', 'records', 'visits'].map((k) => `home.stats.${k}`),
  ...['plot', 'tree', 'deadwood', 'visit'].flatMap((k) => [`capture.${k}`, `capture.${k}.desc`]),
  ...['too_few_points', 'self_intersection', 'duplicate_after_rounding', 'collinear', 'out_of_range'].map((k) => `plot.issue.${k}`),
  ...['walk', 'map'].map((k) => `plot.mode.${k}`), ...['line', 'standing'].map((k) => `dw.mode.${k}`),
  ...['A', 'B', 'C', 'unknown'].map((k) => `ev.level.${k}`),
  ...['done', 'next', 'later'].map((k) => `plan.status.${k}`),
  ...['system', 'light', 'dark'].map((k) => `set.theme.${k}`),
  ...['bhdCm', 'areaHa', 'volumeM3Ha', 'notes', 'createdAt'].map((k) => `tamper.field.${k}`),
  ...Object.entries({ '1a': ['plot', 'tree', 'deadwood', 'visit', 'trust', 'audit', 'lang'], '1b': ['trems47', 'species', 'monitoring', 'qr', 'sync', 'backup'],
    '1c': ['native', 'attest', 'timestamp', 'store'], 2: ['roles', 'checklists', 'sampling', 'auditfolder', 'lang1'],
    3: ['satellite', 'inventory', 'soil', 'tropics', 'lang2'], 4: ['citizen', 'dashboard', 'gbif', 'lang3'] })
    .flatMap(([ph, items]) => [`plan.p${ph}.title`, ...items.map((i) => `plan.p${ph}.${i}`)]),
  ...['plot', 'habitat_tree', 'deadwood_line', 'deadwood_standing', 'visit'].map((k) => `ev.kind.${k}`),
  ...['hash_mismatch', 'signature_invalid', 'media_changed', 'media_missing', 'chain_break'].map((k) => `ev.problem.${k}`),
  ...['low_gps_accuracy', 'no_position', 'position_stale', 'photo_blurry', 'future_time', 'bad_time', 'bad_position'].map((k) => `ev.warn.${k}`),
];
for (const k of dyn) used.add(k);
for (const k of used) if (!(k in base)) problems.push(`Code nutzt unbekannten Schlüssel: ${k}`);
const unused = Object.keys(base).filter((k) => !used.has(k));

console.log(`Sprachen: ${langs.join(', ')} · Schlüssel: ${Object.keys(base).length} · genutzt: ${used.size}`);
if (unused.length) console.log(`Hinweis – ungenutzt (${unused.length}): ${unused.slice(0, 12).join(', ')}${unused.length > 12 ? ' …' : ''}`);
if (problems.length) { console.log('BEFUNDE:'); problems.forEach((p) => console.log('  ✗ ' + p)); process.exit(1); }
console.log('✓ i18n vollständig');
