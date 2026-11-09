# BIOGLOW Forest (Arbeitsname: forest)

Prüfbare Feldnachweise für zertifizierte Wälder: Flächengrenzen (EUDR-GeoJSON), Habitatbäume mit
Mikrohabitaten, Totholz, Feldbesuche. **Jeder Nachweis wird auf dem Gerät signiert** – jede spätere
Änderung fällt auf, und jeder kann es selbst nachprüfen (auch ein Auditor, ohne Server).

Hobby- und Pilotprojekt von arndt-software. Nicht von PEFC herausgegeben oder anerkannt.
Live: https://forest.arndt-software.de · Beschreibung: docs/APP_BESCHREIBUNG.md · Konzept: docs/KONZEPT.md

## Schnellstart

| Was | Befehl |
| --- | --- |
| Abhängigkeiten installieren | `npm install` |
| Entwickeln (Browser, Hot Reload) | `npm run dev` → http://localhost:5173 |
| Alle Checks + Tests | `bash checks/run_all.sh` (mit Browser-Test: `--ui`) |
| Veröffentlichen | `publish.bat` (Doppelklick) – siehe docs/DEPLOY.md |

Kamera und GPS funktionieren nur über HTTPS oder `localhost`. Auf dem Handy daher die Live-Seite testen.

## Was die App kann (Phase 1)

- **Fläche abgrenzen:** Grenze ablaufen (GPS-Mittelung je Eckpunkt, 10 s) oder auf der Karte tippen;
  Fläche, Umfang, EUDR-Regeln (Punkt ≤ 4 ha / Polygon > 4 ha, Selbstüberschneidung, 6 Nachkommastellen)
- **Habitatbaum:** Standort, Fotos aus der App-Kamera, Baumart, BHD, Höhe, Markierung, Mikrohabitate
  (7 Formen / 15 Gruppen nach Larrieu et al. 2018)
- **Totholz:** Linien-Stichprobe (Van Wagner, m³/ha) oder stehender Stamm
- **Feldbesuch:** Ort, Waldtyp, Gesprächspartner, Fotos, Diktieren, Fallbeispiel als PDF
- **Nachweise:** Signaturen + Kette prüfen, Vertrauensstufe A/B/C, Prüf-Paket für Auditoren
- **Paket prüfen:** Auditor lädt das Paket und rechnet alles im Browser nach – Manipulation wird erkannt
- **Länderprofile:** International (PEFC ST 1003), Deutschland (PEFC D 1002-1), Förderprogramm KWM
- **Deutsch + Englisch**, Gerätesprache wird erkannt; offline-fähig (PWA)

## Ordner

```
src/lib/        Logik ohne Oberfläche (geo, trust, forestry, evidence, db, media, pdf)
src/pages/      Seiten · src/components/ Bausteine · src/i18n/ Sprachen (de.js, en.js)
src/test/       Unit-Tests (vitest) · tests/ui_test.py Browser-Test (Playwright)
checks/         Qualitäts-Checks · deploy/ nginx-Config · public/ Rechtstexte, Icons
docs/           Doku (Start: docs/CLAUDE_SESSION_STARTER.md)
```
