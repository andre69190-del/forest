#!/bin/bash
# BIOGLOW Forest — Feature-Verifizierung (Muster aus allen Projekten): Kernfunktionen sind im Code vorhanden.
cd "$(dirname "$0")/.." || exit 1
rc=0
need() { if grep -rq -- "$2" $3; then echo "  ✓ $1"; else echo "  ✗ $1 fehlt ($2 in $3)"; rc=1; fi; }
need "Signatur ECDSA P-256"            "P-256"                 src/lib/trust.js
need "Hash-Kette (prevHash)"           "prevHash"              src/lib/evidence.js
need "Foto-Hash je Bild"               "sha256Hex(p.bytes)"    src/lib/evidence.js
need "Vertrauensstufen A/B/C"          "export function trustLevel" src/lib/trust.js
need "Auditor-Prüfung ohne Server"     "export async function verifyBundle" src/lib/evidence.js
need "EUDR-GeoJSON"                    "export function toEudrGeoJSON" src/lib/geo.js
need "GPS-Mittelung"                   "export function averageFixes" src/lib/geo.js
need "Selbstüberschneidung"            "export function selfIntersects" src/lib/geo.js
need "Mikrohabitate 7 Formen"          "TREM_FORMS"            src/lib/forestry.js
need "Totholz Van Wagner"              "lineIntersectVolume"   src/lib/forestry.js
need "App-Kamera (getUserMedia)"       "getUserMedia"          src/components/Camera.jsx
need "Datei-Foto als Quelle file"      "source: 'file'"        src/components/Camera.jsx
need "Spracheingabe"                   "SpeechRecognition"     src/pages/Visit.jsx
need "PDF Flächen-Pass"                "plotPassPdf"           src/lib/pdf.js
need "Offline (PWA)"                   "VitePWA"               vite.config.js
need "Deutsch + Englisch"              "en: { name"            src/i18n/i18n.jsx
need "Impressum"                       "§ 5 DDG"               public/impressum.html
need "Datenschutz: OSM + Diktieren"    "OpenStreetMap Foundation" public/datenschutz.html
[ $rc -eq 0 ] && echo "✓ Features vollständig"
exit $rc
