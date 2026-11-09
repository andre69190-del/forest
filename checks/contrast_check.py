#!/usr/bin/env python3
"""BIOGLOW Forest — WCAG-Kontrast-Check (Muster: GeoQuest/Polski Szlak contrast_check.py).
Liest die Farb-Tokens aus src/styles/app.css (hell + dunkel) und prüft Text/Hintergrund-Paare ≥ 4,5:1.
Wichtig im Wald: Sonnenlicht auf dem Display. Exit 1 bei Unterschreitung."""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(ROOT, 'src', 'styles', 'app.css'), encoding='utf-8').read()

def tokens(block):
    return dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})', block))
light = tokens(css.split('@media (prefers-color-scheme: dark)')[0])
dark = {**light, **tokens(css.split('@media (prefers-color-scheme: dark)')[1].split('}\n}')[0])}

def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)

PAIRS = [('text', 'bg'), ('text', 'surface'), ('muted', 'bg'), ('muted', 'surface'), ('primary-text', 'primary'),
         ('primary', 'surface'), ('ok-text', 'ok-bg'), ('warn-text', 'warn-bg'), ('err-text', 'err-bg'), ('info-text', 'info-bg'),
         ('badge-a', 'surface'), ('badge-b', 'surface'), ('badge-c', 'surface')]
bad = 0
for name, t in (('hell', light), ('dunkel', dark)):
    for fg, bg in PAIRS:
        r = ratio(t[fg], t[bg])
        ok = r >= 4.5
        bad += not ok
        print(f"  {'✓' if ok else '✗'} {name:6} {fg:13} auf {bg:8} {r:5.2f}:1")
if bad: print(f'BEFUNDE: {bad} Paare unter 4,5:1'); sys.exit(1)
print('✓ Kontrast: alle Paare ≥ 4,5:1')
