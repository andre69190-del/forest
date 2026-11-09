#!/usr/bin/env python3
"""BIOGLOW Forest — Safety-/Security-Check (übernommen & angepasst aus ARDOC/GeoQuest).
  1. Geheime Schlüssel im Code (service_role, sb_secret_, private Schlüssel, JWT-artige Tokens)
  2. XSS-/Injection-Muster (dangerouslySetInnerHTML, eval, new Function, innerHTML =, javascript:)
  3. .env-Schutz in .gitignore
  4. Sicherheits-Header in deploy/nginx-container.conf (CSP, HSTS, X-Frame-Options …)
     und Permissions-Policy: Kamera/Standort/Mikrofon für die eigene Seite ERLAUBT (sonst ist die App kaputt)
  5. Signatur-Schlüssel: privater Schlüssel muss nicht exportierbar erzeugt werden
  6. Keine fremden Skript-Quellen in index.html
Exit 1 bei Befunden.   ->   python3 checks/safety_check.py
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
problems = []

def files(base, exts):
    for dp, dirs, fns in os.walk(base):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git')]
        for fn in fns:
            if os.path.splitext(fn)[1] in exts:
                yield os.path.join(dp, fn)

src = list(files(os.path.join(ROOT, 'src'), {'.js', '.jsx'}))
SECRETS = [(r'service_role', 'service_role-Key'), (r'sb_secret_[A-Za-z0-9_]+', 'Supabase Secret'),
           (r'-----BEGIN [A-Z ]*PRIVATE KEY-----', 'privater Schlüssel (PEM)'),
           (r'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}', 'JWT-artiger Token')]
XSS = [(r'dangerouslySetInnerHTML', 'dangerouslySetInnerHTML'), (r'\beval\s*\(', 'eval('), (r'new\s+Function\s*\(', 'new Function('),
       (r'\.innerHTML\s*=', 'innerHTML ='), (r'javascript:', 'javascript:-URL')]
for p in src:
    txt = open(p, encoding='utf-8').read()
    rel = os.path.relpath(p, ROOT)
    if '/test/' in rel.replace('\\', '/'):
        continue
    for pat, label in SECRETS + XSS:
        if re.search(pat, txt):
            problems.append(f'{rel}: {label}')

gi = open(os.path.join(ROOT, '.gitignore')).read() if os.path.exists(os.path.join(ROOT, '.gitignore')) else ''
if not re.search(r'^\.env$', gi, re.M):
    problems.append('.gitignore: .env fehlt')

conf = open(os.path.join(ROOT, 'deploy', 'nginx-container.conf')).read()
for h in ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']:
    if h not in conf:
        problems.append(f'nginx: Header {h} fehlt')
pp = re.search(r'Permissions-Policy\s+"([^"]+)"', conf)
for feat in ['camera', 'geolocation', 'microphone']:
    if not pp or f'{feat}=(self)' not in pp.group(1):
        problems.append(f'nginx: Permissions-Policy muss {feat}=(self) erlauben (Kernfunktion)')
csp = re.search(r'Content-Security-Policy\s+"([^"]+)"', conf)
if csp and ("'unsafe-eval'" in csp.group(1) or re.search(r"script-src[^;]*'unsafe-inline'", csp.group(1))):
    problems.append('nginx: CSP erlaubt unsafe-eval/unsafe-inline für Skripte')

trust = open(os.path.join(ROOT, 'src', 'lib', 'trust.js'), encoding='utf-8').read()
if not re.search(r'generateKey\(SIG_ALG,\s*false', trust):
    problems.append('trust.js: Geräte-Schlüssel muss mit extractable=false erzeugt werden')

idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
if re.search(r'<script[^>]+src="https?://', idx):
    problems.append('index.html: fremde Skript-Quelle')

logs = sum(len(re.findall(r'console\.log\(', open(p, encoding='utf-8').read())) for p in src)
print(f'Geprüft: {len(src)} Quelldateien · console.log: {logs} (nur Hinweis)')
if problems:
    print('BEFUNDE:'); [print('  ✗ ' + x) for x in problems]; sys.exit(1)
print('✓ Safety: keine Befunde')
