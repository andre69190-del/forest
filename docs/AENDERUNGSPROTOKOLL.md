# Änderungsprotokoll

## 0.4.0 – 09.11.2026 (Phase 1b, ohne Sync)
- 47 Mikrohabitat-Typen mit Mindestgrößen (WSL-Feldführer 2020); Umschalter 15 Gruppen / 47 Typen, auch in den Einstellungen
- KI-Artbestimmung über Pl@ntNet (nur auf Knopfdruck; Schlüssel aus Einstellungen oder Build-Variable VITE_PLANTNET_KEY – nicht im Code)
- Habitatbaum-Detailseite (#/baum/:id) mit Daten, Karte, Vertrauensstufe
- Monitoring: Wiederholungsaufnahmen (Zustand, Foto, Notiz) mit Vorher/Nachher
- QR-Plaketten: Code je Baum, Etiketten-PDF (8 je A4), Scanner (#/scannen) mit BarcodeDetector/jsQR
- Auditor-Mappe je Fläche: PDF (Kennzahlen, Mikrohabitat-Vielfalt, alle Fingerabdrücke, Prüfanleitung) + Prüf-Paket nur dieser Fläche
- PDF: Sonderzeichen (→, „“, ø …) werden für die Standardschrift ersetzt
- Datenschutz: Abschnitt Pl@ntNet; CSP erlaubt my-api.plantnet.org
- Unit-Tests 40, Browser-Test 42 Schritte

## 0.3.1 – 09.11.2026
- Gesprächsnotiz für Konferenzen (COP31): Foto Namensschild/Visitenkarte, Organisation, Themen-Chips, Diktat, Follow-up mit Datum;
  Follow-up-Mail (mailto), Kontakt als vCard, alle Gespräche als CSV; signiert wie jeder Nachweis
- Startseite: eigene Kachel „Gesprächsnotiz“
- Unit-Tests 32, Browser-Test 34 Schritte

## 0.3.0 – 09.11.2026
- Begrüßung als einmaliges Fenster (Sprache wählbar, Demo-Wald, Beschreibung); danach nur noch Link + „Begrüßung erneut zeigen“
- Startseite entschlackt: Erfassen-Kacheln oben, Zahlen + „Zuletzt erfasst“, Demo nur bei leerer App, Installationshinweis ausblendbar
- „Mehr“ gegliedert: Hilfe & Info · Werkzeuge · Einstellungen · Daten & Sicherung · Rechtliches
- Neue Einstellungen: Darstellung (System/Hell/Dunkel), GPS-Mittelung 5–30 s, EUDR-Angaben als eigener Block
- „Manipulation ausprobieren“: verändert eine Kopie und zeigt die Erkennung
- Nachweise: werden beim Öffnen automatisch geprüft; antippen zeigt Details (Standort, Fotoquelle, Fingerabdruck, Vorgänger)
- Browser-Test 31 Schritte

## 0.2.2 – 09.11.2026 (Hotfix)
- 0.2.1 hatte mit `types { … }` die komplette nginx-Dateityp-Liste ersetzt → Live-Seite wurde als Download ausgeliefert (ca. 18:29–Fix)
- Lösung: eigene location für .webmanifest mit default_type
- Neuer Check `checks/nginx_check.sh`: startet die echte nginx-Config in nginx:alpine und prüft Dateitypen, Header, 404

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
