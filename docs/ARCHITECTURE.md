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

## Sync & Gruppen (ab 0.5.0)

- Server: selbst gehostetes Supabase, Schema `deploy/supabase_forest.sql` (Tabellen `forest_*`, Bucket `forest-media`).
- `src/lib/sync.js`: `push` lädt eigene Nachweise **unverändert** hoch (komplettes JSON in `record`), Fotos in den Bucket;
  `pull` holt Nachweise anderer Geräte, prüft jede Signatur mit dem Schlüssel aus `forest_devices` und speichert nur gültige.
- Server-Zusatzinfos stehen in nicht signierten Feldern (`server`, `_sync` – in `trust.js` von der Signatur ausgenommen).
- Unveränderlichkeit doppelt: keine UPDATE/DELETE-Regeln für Inhalte + Trigger; einzig `group_id` darf der Eigentümer setzen.
- `src/lib/cloud.js`: Adapter zu supabase-js (lazy); Zugangsdaten nur als Build-Variablen.
- Tabellen lokal (Dexie v2): `synced` (hochgeladene eigene Nachweise), `peers` (öffentliche Schlüssel anderer Geräte).
