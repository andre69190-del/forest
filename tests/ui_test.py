#!/usr/bin/env python3
"""BIOGLOW Forest – Browser-Test (Playwright, Muster aus Polski Szlak tests/ui_test.py).

Spielt den Kern-Ablauf echt im Browser durch – mit simuliertem GPS und simulierter Kamera:
  Start → Fläche auf der Karte setzen → signieren → Habitatbaum mit Foto → Totholz-Linie
  → Feldbesuch → Nachweise prüfen (alle Stufe B, Kette ok) → Prüf-Paket exportieren
  → Paket im Auditor-Modus prüfen → Manipulation am Paket wird erkannt → Sprache EN.
Voraussetzung: npm run build. Start: python3 tests/ui_test.py   (Exit 1 bei Fehlern)
Browser: Playwright-Chromium oder CHROME_PATH=/pfad/zu/chrome
Live-Seite testen (mit echter CSP): BASE_URL=https://forest.arndt-software.de python3 tests/ui_test.py
"""
import json, os, subprocess, sys, time, socket
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 4179
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(('  OK   ' if cond else '  FAIL ') + name)

def wait_port(port, timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        with socket.socket() as s:
            if s.connect_ex(('127.0.0.1', port)) == 0: return True
        time.sleep(0.3)
    return False

LIVE = os.environ.get('BASE_URL')
server = None if LIVE else subprocess.Popen(['npx', 'vite', 'preview', '--port', str(PORT), '--strictPort'], cwd=ROOT,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    if server and not wait_port(PORT): print('Server startet nicht'); sys.exit(1)
    with sync_playwright() as p:
        kw = {'args': ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']}
        if os.environ.get('CHROME_PATH'): kw['executable_path'] = os.environ['CHROME_PATH']
        browser = p.chromium.launch(**kw)
        ctx = browser.new_context(locale='de-DE', geolocation={'latitude': 49.3001, 'longitude': 8.6401, 'accuracy': 4},
                                  permissions=['geolocation', 'camera'], accept_downloads=True)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and 'tile.openstreetmap' not in m.text and errors.append(m.text))
        page.on('console', lambda m: 'Content Security Policy' in m.text and errors.append('CSP: ' + m.text[:160]))
        page.route('https://tile.openstreetmap.org/**', lambda r: r.fulfill(status=204, body=''))
        base = (LIVE.rstrip('/') + '/') if LIVE else f'http://127.0.0.1:{PORT}/'
        page.goto(base)
        page.wait_for_selector('dialog.welcome[open]')
        check('Begrüßung erscheint beim ersten Start', page.is_visible('text=Willkommen bei BIOGLOW Forest'))
        page.click('dialog.welcome button:has-text("Leer starten")')
        page.reload()
        page.wait_for_selector('text=Willkommen im Wald')
        page.wait_for_timeout(500)
        check('Begrüßung nach dem Schließen nicht mehr', not page.is_visible('dialog.welcome[open]'))
        check('Startseite (DE erkannt)', page.is_visible('text=Willkommen im Wald'))

        # Fläche auf der Karte setzen (4 Klicks ≈ Rechteck)
        page.goto(base + '#/erfassen/flaeche')
        page.fill('input[placeholder^="z. B. Hirschgrund"]', 'Testfläche Nord')
        page.click('text=Auf Karte tippen')
        box = page.locator('.leaflet-container').bounding_box()
        for dx, dy in [(0.3, 0.3), (0.7, 0.3), (0.7, 0.7), (0.3, 0.7)]:
            page.mouse.click(box['x'] + box['width'] * dx, box['y'] + box['height'] * dy)
            page.wait_for_timeout(150)
        check('4 Eckpunkte gesetzt', page.is_visible('text=4 Eckpunkte'))
        check('Fläche berechnet', page.is_visible('text=Fläche:'))
        page.click('button:has-text("Signieren & speichern")')
        page.wait_for_selector('text=Habitatbäume auf der Fläche')
        check('Fläche signiert, Detailseite offen', True)
        plot_url = page.url

        # Habitatbaum mit Kamera-Foto
        page.click('a:has-text("Habitatbaum")')
        page.click('button:has-text("Standort bestimmen")')
        page.wait_for_selector('text=± 4 m', timeout=15000)
        check('GPS-Standort übernommen', True)
        page.click('button:has-text("Kamera öffnen")')
        page.wait_for_timeout(1500)
        page.click('button:has-text("Auslösen")')
        page.wait_for_selector('.thumbs img')
        check('Foto aus App-Kamera', page.locator('.thumbs img').count() == 1)
        page.click('button:has-text("Schließen")')
        page.fill('input[placeholder^="z. B. Rotbuche"]', 'Rotbuche')
        page.locator('input[type=number]').first.fill('48')
        page.click('text=Spechthöhlen')
        page.click('text=Mehrjährige Porlinge')
        page.click('button:has-text("Signieren & speichern")')
        page.wait_for_url(plot_url)
        page.wait_for_selector('text=Habitatbäume auf der Fläche')
        check('Habitatbaum zählt auf der Fläche', page.locator('.big').first.inner_text().startswith('1'))

        # Totholz-Linie
        page.click('a:has-text("Totholz")')
        page.click('button:has-text("Standort bestimmen")')
        page.wait_for_selector('text=± 4 m', timeout=15000)
        dia = page.locator('input[type=number]').nth(1)
        for d in ['20', '35', '8']:
            dia.fill(d); page.click('button:has-text("Stück hinzufügen")')
        check('3 Stücke erfasst', page.is_visible('text=3 Stücke'))
        vol = page.locator('.big').inner_text()
        check('Volumen nach Van Wagner (20 + 35 cm auf 100 m ≈ 20,0 m³/ha)', '20' in vol)
        page.click('button:has-text("Signieren & speichern")')
        page.wait_for_url(plot_url)

        # Feldbesuch
        page.goto(base + '#/erfassen/besuch')
        page.fill('input[placeholder^="z. B. Forstbetrieb"]', 'Testbetrieb Walldorf')
        page.fill('input[placeholder="BR"]', 'de')
        page.fill('textarea', 'Buchenmischwald, viel Naturverjüngung.')
        page.click('button:has-text("Signieren & speichern")')
        page.wait_for_selector('text=Signiert gespeichert.')
        check('Feldbesuch signiert', True)
        with page.expect_download() as dl:
            page.click('button:has-text("Fallbeispiel (PDF)")')
        check('Fallbeispiel-PDF erzeugt', dl.value.suggested_filename.endswith('.pdf'))

        # Nachweise prüfen
        page.goto(base + '#/nachweise')
        page.click('button:has-text("Alle prüfen")')
        page.wait_for_selector('text=Kette lückenlos')
        check('Kette lückenlos (4 Nachweise)', page.is_visible('text=Kette lückenlos (4 Nachweise).'))
        check('Alle Nachweise Stufe B', page.locator('.badge-B').count() == 4)
        with page.expect_download() as dl:
            page.click('button:has-text("Prüf-Paket für Auditor")')
        bundle_path = dl.value.path()
        bundle = json.load(open(bundle_path))
        check('Prüf-Paket enthält 4 Nachweise + Foto', len(bundle['records']) == 4 and len(bundle['media']) == 1)

        # Manipulation ausprobieren
        page.click('button:has-text("Manipulation ausprobieren")')
        page.wait_for_selector('.tamper-bad')
        check('Manipulation: Original gültig, Kopie erkannt',
              page.locator('.tamper-col').first.locator('.badge-B').count() == 1
              and page.locator('.tamper-bad .badge-C').count() == 1
              and 'Inhalt nachträglich verändert' in page.locator('.tamper-bad').inner_text())
        page.locator('.list-button').first.click()
        check('Nachweis-Details mit Fingerabdruck', page.locator('.details code.hash').first.inner_text().__len__() == 64)

        # EUDR-GeoJSON
        page.goto(plot_url)
        with page.expect_download() as dl:
            page.click('button:has-text("EUDR-GeoJSON")')
        gj = json.load(open(dl.value.path()))
        g = gj['features'][0]['geometry']
        props = gj['features'][0]['properties']
        if g['type'] == 'Point':
            check('EUDR-GeoJSON: Punkt (≤ 4 ha) mit Area als Zahl', isinstance(props.get('Area'), (int, float)) and props['Area'] <= 4)
        else:
            ring = g['coordinates'][0]
            check('EUDR-GeoJSON: geschlossenes Polygon (> 4 ha)', g['type'] == 'Polygon' and len(ring) >= 5 and ring[0] == ring[-1] and 'Area' not in props)
        first = g['coordinates'] if g['type'] == 'Point' else g['coordinates'][0][0]
        check('EUDR-GeoJSON: [Länge, Breite] mit max. 6 Nachkommastellen', abs(first[0] - 8.64) < 0.1 and all(round(c, 6) == c for c in first))
        with page.expect_download() as dl:
            page.click('button:has-text("Flächen-Pass (PDF)")')
        check('Flächen-Pass-PDF erzeugt', dl.value.suggested_filename.endswith('.pdf'))

        # Auditor: Original und manipuliertes Paket
        tampered = json.loads(json.dumps(bundle))
        tree = next(r for r in tampered['records'] if r['kind'] == 'habitat_tree')
        tree['data']['bhdCm'] = 80
        tp = os.path.join(os.path.dirname(bundle_path), 'tampered.json')
        json.dump(tampered, open(tp, 'w'))
        page.goto(base + '#/pruefen')
        page.set_input_files('input[type=file]', bundle_path)
        page.wait_for_selector('text=4 von 4 Nachweisen unverändert.')
        check('Auditor: Original-Paket vollständig gültig', True)
        page.set_input_files('input[type=file]', tp)
        page.wait_for_selector('text=3 von 4 Nachweisen unverändert.')
        check('Auditor: manipulierter BHD wird erkannt', page.is_visible('text=Inhalt nachträglich verändert'))

        # Sprache umschalten
        page.goto(base + '#/mehr')
        page.select_option('select >> nth=1', 'dark')
        check('Darstellung dunkel wählbar', page.evaluate("document.documentElement.dataset.theme") == 'dark')
        page.select_option('select >> nth=0', 'en')
        page.goto(base + '#/')
        check('Sprache EN', page.is_visible('text=Welcome to the forest'))

        # Neuer Nutzer: Demo-Wald, Beschreibung, Roadmap
        ctx2 = browser.new_context(locale='de-DE', geolocation={'latitude': 49.332, 'longitude': 8.615, 'accuracy': 5},
                                   permissions=['geolocation', 'camera'], accept_downloads=True)
        p2 = ctx2.new_page()
        p2.on('pageerror', lambda e: errors.append(str(e)))
        p2.route('https://tile.openstreetmap.org/**', lambda r: r.fulfill(status=204, body=''))
        p2.goto(base)
        p2.click('dialog.welcome button:has-text("Mit Demo-Wald ansehen")')
        p2.wait_for_selector('text=Demo-Wald Hardt')
        check('Demo-Wald: 4 Habitatbäume auf der Fläche', p2.locator('.big').first.inner_text().startswith('4'))
        p2.goto(base)
        try:
            p2.wait_for_selector('text=Sichere sie regelmäßig', timeout=5000); ok_b = True
        except Exception:
            ok_b = False
        check('Sicherungs-Erinnerung erscheint', ok_b)
        p2.click('.footer-links >> text=Was ist BIOGLOW Forest?')
        check('Beschreibung: Abschnitt Fälschungsschutz', p2.is_visible('text=Wie der Fälschungsschutz funktioniert'))
        p2.click('text=Was geplant ist')
        check('Roadmap: 6 Phasen', p2.locator('.card').count() == 6)
        p2.goto(base + '#/nachweise')
        p2.click('button:has-text("Alle prüfen")')
        p2.wait_for_selector('text=Kette lückenlos (7 Nachweise).')
        check('Demo-Nachweise signiert und gültig', p2.locator('.badge-B').count() == 7)
        # Habitatbaum-Detail, Monitoring, QR-Plaketten, Auditor-Mappe
        p2.goto(base + '#/flaechen')
        p2.click('text=Demo-Wald Hardt')
        p2.wait_for_selector('text=Mikrohabitat-Vielfalt')
        check('Mikrohabitat-Vielfalt angezeigt', p2.is_visible('text=von 15 Gruppen'))
        downloads = []
        p2.on('download', lambda d: downloads.append(d.suggested_filename))
        p2.click('button:has-text("QR-Plaketten (PDF)")')
        p2.click('button:has-text("Auditor-Mappe")')
        for _ in range(60):
            if len(downloads) >= 3: break
            p2.wait_for_timeout(250)
        check('QR-Plaketten-PDF', any(n.startswith('QR-Plaketten') and n.endswith('.pdf') for n in downloads))
        check('Auditor-Mappe: PDF + Prüf-Paket', any(n.startswith('Auditor-Mappe') for n in downloads) and any(n.startswith('Pruefpaket_Demo') for n in downloads))
        p2.click('a.list-item:has-text("#1")')
        p2.wait_for_selector('img.qr')
        check('Baum-Detail mit QR-Plakette', p2.is_visible('text=Monitoring'))
        p2.click('button:has-text("Neue Aufnahme")')
        p2.select_option('label:has-text("Zustand") select', 'dead_standing')
        p2.click('button:has-text("Signieren & speichern")')
        p2.wait_for_selector('text=abgestorben, stehend')
        check('Monitoring-Aufnahme gespeichert', True)
        p2.goto(base + '#/scannen')
        p2.wait_for_selector('video')
        check('Scanner öffnet Kamera', p2.locator('video').count() == 1)
        p2.goto(base + '#/erfassen/baum')
        p2.click('button:has-text("47 Typen (Inventur)")')
        check('47 Mikrohabitat-Typen wählbar', p2.locator('.check-type').count() == 47)
        p2.click('summary:has-text("Spechthöhlen")')
        p2.click('text=Große Spechthöhle (ø > 10 cm)')
        check('Typ mit Mindestgröße', p2.is_visible('text=Mindestgröße: Eingang ø > 10 cm') and p2.is_visible('text=1 gewählt'))

        # Gesprächsnotiz (Konferenz)
        p2.goto(base + '#/erfassen/gespraech')
        field = lambda lbl: p2.locator(f'label.field:has(span.field-label:text-is("{lbl}")) input')
        field('Name').fill('Ana Souza')
        field('Organisation').fill('Ministério do Meio Ambiente')
        p2.locator('input[type=email]').fill('ana@example.org')
        p2.locator('input[placeholder^="z. B. COP31"]').fill('COP31 Antalya')
        p2.click('label.chip-toggle:has-text("EUDR")')
        p2.click('label.chip-toggle:has-text("Gruppenzertifizierung")')
        p2.fill('textarea', 'Interesse an Gruppenzertifizierung für Kleinbauern.')
        p2.locator('input[placeholder^="z. B. Positionspapier"]').fill('Whitepaper schicken')
        p2.click('button:has-text("Signieren & speichern")')
        p2.wait_for_selector('text=Gespräche (1)')
        check('Gesprächsnotiz gespeichert', p2.is_visible('text=Ana Souza · Ministério do Meio Ambiente'))
        check('Follow-up-Mail-Knopf da', p2.is_visible('button:has-text("Follow-up-Mail")'))
        with p2.expect_download() as dl:
            p2.click('button:has-text("Kontakt speichern")')
        vcf = open(dl.value.path(), encoding='utf-8').read()
        check('Kontakt als vCard', 'FN:Ana Souza' in vcf and 'EMAIL;TYPE=INTERNET:ana@example.org' in vcf)
        ctx2.close()

        check('Keine JS-Fehler', not errors)
        if errors: print('\n'.join(errors[:5]))
        browser.close()
finally:
    if server: server.terminate()

ok = sum(1 for _, c in results if c)
print(f'\n{ok}/{len(results)} OK')
sys.exit(0 if ok == len(results) else 1)
