#!/usr/bin/env python3
"""BIOGLOW Forest — Performance-/Größen-Check (Muster: GeoQuest/ARDOC perf_check.py).
Prüft dist/ nach dem Build: Start-Bundle (gzip) klein genug für schwaches Netz im Wald,
schwere Bibliotheken (jsPDF) nur nachgeladen. Exit 1 bei Überschreitung."""
import gzip, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
if not os.path.isdir(DIST): print('dist/ fehlt – erst npm run build'); sys.exit(1)
html = open(os.path.join(DIST, 'index.html'), encoding='utf-8').read()
entry = re.findall(r'src="/assets/([^"]+\.js)"', html)
LIMIT_ENTRY_GZ = 200 * 1024
bad = 0
for e in entry:
    raw = open(os.path.join(DIST, 'assets', e), 'rb').read()
    gz = len(gzip.compress(raw))
    ok = gz <= LIMIT_ENTRY_GZ
    bad += not ok
    print(f"  {'✓' if ok else '✗'} Start-Bundle {e}: {len(raw)//1024} KB, gzip {gz//1024} KB (Grenze {LIMIT_ENTRY_GZ//1024} KB)")
assets = os.listdir(os.path.join(DIST, 'assets'))
lazy_pdf = any(a.startswith('jspdf') for a in assets)
print(f"  {'✓' if lazy_pdf else '✗'} jsPDF als eigener, nachgeladener Teil")
bad += not lazy_pdf
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(DIST) for f in fs)
print(f'  Gesamtgröße dist/: {total // 1024} KB')
if bad: sys.exit(1)
print('✓ Performance ok')
