# Änderungsprotokoll

## 0.2.1 – 09.11.2026
- Live-Fehler behoben: Flächen-Pass mit Foto wurde von der CSP blockiert (connect-src erlaubt jetzt blob:/data: für jsPDF)
- nginx liefert manifest.webmanifest mit richtigem Typ (application/manifest+json)
- `vite preview` übernimmt die Sicherheits-Header aus deploy/nginx-container.conf → Tests laufen mit derselben CSP wie live
- Browser-Test: CSP-Verstöße zählen als Fehler; `BASE_URL=…` testet die Live-Seite

## 0.2.0 – 09.11.2026
- Seite „Über BIOGLOW Forest“ (#/info): ausführliche Beschreibung DE/EN
- Seite „Was geplant ist“ (#/geplant): Roadmap in 6 Phasen
- Demo-Wald (signierte Beispieldaten, Schwetzinger Hardt) für den ersten Eindruck
- Sicherungs-Erinnerung (Prüf-Paket älter als 7 Tage), Installationshinweis iPhone/Android
- „Alle lokalen Daten löschen“ mit Bestätigung
- publish.bat installiert Pakete beim ersten Lauf selbst
- Browser-Test auf 26 Schritte erweitert

## 0.1.0 – 09.11.2026
- Projekt angelegt (Muster: ARDOC-Stack, Checks aus GeoQuest/Polski Szlak, Kamera/Schärfe/GPS aus BIOGLOW)
- Signatur- und Prüfkette (ECDSA P-256, SHA-256, Hash-Kette, Stufen A/B/C, Plausibilität)
- EUDR-GeoJSON nach den Regeln des EU-Informationssystems
- Habitatbaum mit 15 Mikrohabitat-Gruppen, Totholz (Van Wagner), Länderprofile INT/DE/DE_KWM
- Feldbesuch mit Diktieren und Fallbeispiel-PDF, Flächen-Pass-PDF
- Prüf-Paket + Auditor-Prüfung im Browser
- Rechtstexte, nginx (CSP, Permissions-Policy erlaubt Kamera/GPS/Mikrofon für self), Dockerfile
