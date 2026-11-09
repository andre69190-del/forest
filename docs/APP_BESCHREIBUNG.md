# BIOGLOW Forest – App-Beschreibung

**Live:** https://forest.arndt-software.de · Version 0.2.0 · Deutsch und Englisch

BIOGLOW Forest macht sichtbar, was Satelliten nicht sehen: was unter dem Kronendach eines Waldes wirklich ist – und zwar so, dass jeder es nachprüfen kann.

## Wofür ist die App?

Zertifizierte Wälder müssen Biotopholz erhalten, Böden schonen und ihre Flächen sauber abgrenzen. Investoren, Behörden und die EU-Entwaldungsverordnung (EUDR) verlangen dafür zunehmend harte, überprüfbare Daten statt Papierprotokollen. Satelliten sehen nur das Kronendach.

Mit BIOGLOW Forest erfasst man direkt im Wald Flächengrenzen, Habitatbäume, Totholz und Beobachtungen – mit Foto, GPS und Zeit. Jeder Eintrag wird auf dem Handy kryptografisch signiert. Das Ergebnis sind Nachweise, die man weitergeben und deren Echtheit man selbst prüfen kann.

## Für wen?

- Waldbesitzer: Fläche abgrenzen, Habitatbäume und Totholz dokumentieren, EUDR-Geodaten und Flächen-Pass erzeugen.
- Gruppen (z. B. Forstbetriebsgemeinschaften): Belege für die interne Überwachung ihrer Mitglieder sammeln.
- Prüfer und Auditoren: Prüf-Pakete öffnen und jede Signatur, jedes Foto und die Kette selbst nachrechnen – ohne Server.
- Fachleute auf Reisen: einen Wald in 15 Minuten dokumentieren, Gespräche diktieren, ein Fallbeispiel als PDF erstellen.

## Was die App heute kann

- Fläche abgrenzen: Grenze ablaufen (GPS wird pro Eckpunkt 10 Sekunden gemittelt) oder auf der Karte tippen. Fläche, Umfang und Prüfung nach EUDR-Regeln (Punkt bis 4 ha, Polygon darüber, keine Selbstüberschneidung).
- Habitatbaum: Standort, Fotos aus der App-Kamera mit Schärfeprüfung, Baumart, Brusthöhendurchmesser, Höhe, Markierung und Mikrohabitate nach dem europäischen Katalog (7 Formen, 15 Gruppen).
- Totholz: Linien-Stichprobe nach Van Wagner (Ergebnis in m³ je Hektar) oder einzelner stehender Stamm, jeweils mit Zersetzungsgrad.
- Feldbesuch: Ort, Land, Waldtyp, Gesprächspartner, Fotos, Diktieren – und ein einseitiges Fallbeispiel als PDF.
- Nachweise: Alle Einträge prüfen (Signatur, Fotos, lückenlose Kette) mit Vertrauensstufe; Prüf-Paket für Auditoren exportieren.
- Paket prüfen: Ein Auditor lädt ein Prüf-Paket und sieht sofort, ob etwas nachträglich verändert wurde.
- Länderprofile: International (PEFC ST 1003:2024), Deutschland (PEFC D 1002-1) und Förderprogramm Klimaangepasstes Waldmanagement mit Zielwerten.
- Offline, Deutsch und Englisch: Alles funktioniert ohne Netz; die Sprache folgt dem Handy und ist umschaltbar. Exporte: EUDR-GeoJSON, Flächen-Pass, Fallbeispiel, Prüf-Paket.

## Wie der Fälschungsschutz funktioniert

Beim ersten Start erzeugt das Handy ein eigenes Schlüsselpaar. Der private Schlüssel verlässt das Gerät nie. Jeder Eintrag – inklusive Fingerabdruck jedes Fotos, Standort und Zeit – wird damit signiert und mit dem vorherigen Eintrag verkettet.

Ändert jemand später auch nur eine Zahl oder ein Pixel, passt die Signatur nicht mehr. Fehlt ein Eintrag, reißt die Kette. Jeder Nachweis trägt deshalb eine Vertrauensstufe:

- Stufe A – geprüft: zusätzlich Geräteprüfung durch Apple/Google und Zeitstempel eines unabhängigen Dienstes (kommt mit der App aus dem App Store).
- Stufe B – signiert: Foto aus der App-Kamera, Signatur, Fotos und Kette unverändert. Das ist die Stufe der Web-App.
- Stufe C – nur Hinweis: Foto aus einer Datei, Veränderung erkannt oder Plausibilitätsfehler.

## Deine Daten

Kein Konto, keine Werbung, kein Tracking. Alle Einträge bleiben auf deinem Gerät. Sie verlassen es nur, wenn du selbst etwas exportierst und weitergibst.

Weil es (noch) keine Cloud-Kopie gibt, sichere regelmäßig ein Prüf-Paket. Für die Karte lädt das Handy Kartenbilder von OpenStreetMap.

## Was die App nicht ist

BIOGLOW Forest ist ein Hobby- und Pilotprojekt von arndt-software. Es ist nicht von PEFC oder einer anderen Zertifizierungsorganisation herausgegeben oder anerkannt.

Die App ersetzt kein Audit einer akkreditierten Zertifizierungsstelle. Sie liefert prüfbare Daten für die interne Überwachung und für Auditoren.

Eine Signatur beweist, dass ein Nachweis mit diesem Gerät zu dieser Zeit an diesem Ort entstand und seitdem unverändert ist – nicht, dass die Kamera auf das Richtige zeigte. Stichproben vor Ort bleiben nötig.

## Als App installieren

- iPhone/iPad: In Safari unten auf „Teilen“ tippen → „Zum Home-Bildschirm“ → „Hinzufügen“.
- Android: Im Chrome-Menü (⋮) „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.

Installiert startet die App wie eine normale App, im Vollbild und auch ohne Netz im Wald.

## So probierst du es in 5 Minuten aus

1. Seite öffnen und als App installieren (siehe oben).
2. Auf der Startseite **Demo-Wald laden** – eine Fläche mit vier Habitatbäumen, Totholz und einem Feldbesuch erscheint.
3. Unter **Nachweise** auf **Alle prüfen** tippen: alle Einträge sind signiert (Stufe B), die Kette ist lückenlos.
4. **Prüf-Paket für Auditor** exportieren und unter **Mehr → Paket prüfen** wieder laden – so sieht ein Auditor die Prüfung.
5. Im Wald: **Erfassen → Feldbesuch** – Fotos, Diktat, danach **Fallbeispiel (PDF)**.
6. Demo entfernen: **Mehr → Alle lokalen Daten löschen**.

## Was geplant ist

Siehe in der App unter **Mehr → Was geplant ist** (Phasen 1a bis 4).
