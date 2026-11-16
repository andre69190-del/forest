# Arbeitsstand

**Version 0.6.0 · 14.11.2026 · Phasen 1a, 1b und 2 fertig (5 Sprachen); Sync braucht einmalige Einrichtung (docs/DEPLOY.md)**

## Fertig
- Kernlogik mit 29 Unit-Tests: Geo/EUDR, Signatur- und Prüfkette, Mikrohabitate, Totholz, Länderprofile
- Oberfläche: Start, Flächen (Ablaufen/Karte), Habitatbaum, Totholz, Feldbesuch (Diktieren, PDF),
  Nachweise (Prüfen, Prüf-Paket), Auditor-Prüfung, Einstellungen, Über & Grenzen
- Deutsch + Englisch, PWA offline, Impressum/Datenschutz, nginx mit CSP und Sicherheits-Headern
- Checks: Build, Unit-Tests, i18n, Features, Safety, Kontrast, Performance; Browser-Test 26/26
- Beschreibung (#/info), Roadmap (#/geplant), Demo-Wald, Sicherungs-Erinnerung, Installationshinweis

- Phase 2: Gruppenzertifizierung (Teilnehmer, Stichprobe, interne Prüfung nach PEFC D 1002-1:2020 oder internationalem Benchmark PEFC ST 1003:2024, Abweichungen, Gruppenbericht)

## Offen (siehe docs/ROADMAP.md)
- Phase 2 fertig (inkl. PT, ES, FR); später: Checklisten weiterer nationaler Standards (z. B. Brasilien CERFLOR, Malaysia MTCS)
- Native Hülle (Capacitor) mit App Attest / Play Integrity → Stufe A
- Server-Zeitstempel (RFC 3161) + Prüfdienst
- 47 Mikrohabitat-Typen mit Bildkatalog und Mindestgrößen
- KI-Artbestimmung aus BIOGLOW übernehmen
- Feste Monitoring-Punkte; QR-Plakette am Habitatbaum (aus ARDOC)
- Geräte-Sync und Gruppen mit Rollen (aus ARDOC, Supabase)

## Bekannte Grenzen
- Datenverlust, wenn Browserdaten gelöscht werden → Konto & Sync nutzen oder regelmäßig Prüf-Paket exportieren
- OSM-Kacheln: Nutzungsregeln der OSMF erlauben keinen Massen-Download; für Offline-Karten ganzer Gebiete
  später eigener Kachel-Dienst (z. B. MapTiler/eigener Server)
