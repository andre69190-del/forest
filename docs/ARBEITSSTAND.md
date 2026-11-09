# Arbeitsstand

**Version 0.4.0 · 09.11.2026 · Phase 1a fertig, 1b bis auf Sync/Gruppen fertig; live unter forest.arndt-software.de**

## Fertig
- Kernlogik mit 29 Unit-Tests: Geo/EUDR, Signatur- und Prüfkette, Mikrohabitate, Totholz, Länderprofile
- Oberfläche: Start, Flächen (Ablaufen/Karte), Habitatbaum, Totholz, Feldbesuch (Diktieren, PDF),
  Nachweise (Prüfen, Prüf-Paket), Auditor-Prüfung, Einstellungen, Über & Grenzen
- Deutsch + Englisch, PWA offline, Impressum/Datenschutz, nginx mit CSP und Sicherheits-Headern
- Checks: Build, Unit-Tests, i18n, Features, Safety, Kontrast, Performance; Browser-Test 26/26
- Beschreibung (#/info), Roadmap (#/geplant), Demo-Wald, Sicherungs-Erinnerung, Installationshinweis

## Offen in Phase 1 (siehe docs/ROADMAP.md)
- Native Hülle (Capacitor) mit App Attest / Play Integrity → Stufe A
- Server-Zeitstempel (RFC 3161) + Prüfdienst
- 47 Mikrohabitat-Typen mit Bildkatalog und Mindestgrößen
- KI-Artbestimmung aus BIOGLOW übernehmen
- Feste Monitoring-Punkte; QR-Plakette am Habitatbaum (aus ARDOC)
- Geräte-Sync und Gruppen mit Rollen (aus ARDOC, Supabase)

## Bekannte Grenzen
- Datenverlust, wenn Browserdaten gelöscht werden → regelmäßig Prüf-Paket exportieren (Sync kommt in Phase 2)
- OSM-Kacheln: Nutzungsregeln der OSMF erlauben keinen Massen-Download; für Offline-Karten ganzer Gebiete
  später eigener Kachel-Dienst (z. B. MapTiler/eigener Server)
