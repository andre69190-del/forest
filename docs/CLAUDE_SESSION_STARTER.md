# BIOGLOW Forest — Claude Session Starter

> Diesen Block an den Anfang der ersten Nachricht einer neuen Session kopieren.

```
Projekt: BIOGLOW Forest (Arbeitsname "forest") – PWA für prüfbare Feldnachweise in zertifizierten Wäldern
Ordner:  C:\Users\Andre\Desktop\Cowork\forest   ·  Live: https://forest.arndt-software.de
Repo:    andre69190-del/forest  ·  Deploy: Coolify (Dockerfile), Auto-Deploy bei Push
Konzept: docs/KONZEPT.md (Link zum Produktkonzept)  ·  Stand: docs/ARBEITSSTAND.md

Stack: React 18 + Vite 6 + Dexie (IndexedDB) + Leaflet + jsPDF (lazy) + vite-plugin-pwa
Routing: HashRouter (#/…) → nginx liefert nur "/" (unbekannte Pfade = 404, SEO)

Kernregeln (nicht verletzen):
- Nachweise sind UNVERÄNDERLICH. Korrektur = neuer Nachweis mit "supersedes". Nie records überschreiben.
- Alles, was signiert wird, geht durch src/lib/evidence.js → createEvidence() (serielle Warteschlange, prevHash!)
- Neue Felder im signierten Körper ändern die Hashes NICHT rückwirkend – alte Nachweise bleiben gültig.
- Privater Schlüssel: extractable=false. Nie exportieren, nie loggen.
- Fotos: App-Kamera = source "camera"; Datei = "file" (→ höchstens Stufe C). Nicht aufweichen.
- Stufe A nur mit Geräte-Attest + Server-Zeitstempel (kommt mit nativer App). PWA = max. B.
- Texte nur über t('…'); jeder neue Schlüssel in ALLEN Sprachdateien (checks/i18n_check.mjs).
- Farben nur als Tokens (hell + dunkel), Kontrast ≥ 4,5:1.
- Keine Aussage "PEFC-zertifiziert/anerkannt", kein PEFC-Logo (Markenrecht, PEFC ST 2001).
- Standards-Zahlen nur mit Quelle in src/lib/forestry.js (PROFILES.sourceUrl).

Pflicht-Workflow nach JEDER Änderung:
1. bash checks/run_all.sh        → „alles bestanden“
2. python3 tests/ui_test.py      → alle OK (Browser-Test mit simuliertem GPS + Kamera)
3. Eintrag in docs/AENDERUNGSPROTOKOLL.md, Stand in docs/ARBEITSSTAND.md
4. Version in package.json + APP_VERSION (src/lib/evidence.js) bei Releases hochzählen
5. publish.bat → Coolify baut automatisch (Docker-Build bricht bei roten Unit-Tests ab)
```
