# Architektur

## Datenfluss eines Nachweises

1. Seite sammelt Daten, Standort (`getBestPosition`, bester Fix in 12 s) und Fotos (`Camera`, Videostrom → JPEG, Schärfe).
2. `createEvidence(kind, data, {position, photos, plotId})` (src/lib/evidence.js) – **seriell**:
   - Foto-Bytes → SHA-256 → `media[]` im Nachweis; Bytes in Tabelle `media`
   - `prevHash` = Hash des letzten Nachweises dieses Geräts (`seq` fortlaufend)
   - `signRecord` (src/lib/trust.js): kanonisches JSON → SHA-256 → ECDSA-P-256-Signatur
3. Gespeichert in IndexedDB (`records`), unveränderlich.

## Prüfen

- `verifyAll()` – eigenes Gerät: Signatur, Hash, Fotos, Kette, Plausibilität → Stufe A/B/C
- `exportBundle()` – Paket mit Nachweisen, Fotos (Base64), Ketten-Hashes, öffentlichem Schlüssel
- `verifyBundle()` – Auditor rechnet alles im Browser nach, ohne Server

## Vertrauensstufen

| Stufe | Bedingung |
| --- | --- |
| A | App-Kamera, Signatur/Hash/Fotos/Kette ok, Geräte-Attest **und** Server-Zeitstempel (native App, kommt) |
| B | App-Kamera, Signatur/Hash/Fotos/Kette ok (Web-App) |
| C | Datei-Foto, Bruch, oder Plausibilitätsfehler |

## Tabellen (Dexie, Datenbank `bioglow-forest`)

| Tabelle | Inhalt |
| --- | --- |
| records | signierte Nachweise (`plot`, `habitat_tree`, `deadwood_line`, `deadwood_standing`, `visit`) |
| media | Foto-Bytes je Nachweis |
| keys | Geräte-Schlüssel (`id: 'device'`, privater Schlüssel nicht exportierbar) |
| settings | Profil, Erzeuger, Land |

Flächen tragen eine stabile `plotKey`; Bäume und Totholz verweisen über `plotId` darauf.
