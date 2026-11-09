#!/bin/bash
# BIOGLOW Forest — nginx-Config im ECHTEN nginx:alpine-Container prüfen (nur wenn Docker verfügbar).
# Hintergrund: Am 09.11.2026 hat ein types{}-Block alle Dateitypen gelöscht → Seite wurde als Download ausgeliefert.
# Prüft Dateitypen, Sicherheits-Header und 404 für unbekannte Pfade.   ->  bash checks/nginx_check.sh
cd "$(dirname "$0")/.." || exit 1
if ! docker info >/dev/null 2>&1; then echo "Docker nicht verfügbar – Check übersprungen"; exit 0; fi
[ -d dist ] || { echo "dist/ fehlt – erst npm run build"; exit 1; }
tmp=$(mktemp -d); cp -r dist "$tmp/dist"; # Testumgebung: ohne IPv6 und mit Host-Netz auf Port 18080 (Produktions-Config bleibt unverändert)
sed -e '/listen \[::\]:80;/d' -e 's/listen 80;/listen 18080;/' deploy/nginx-container.conf > "$tmp/forest.conf"
printf 'FROM nginx:alpine\nRUN rm -f /etc/nginx/conf.d/default.conf\nCOPY forest.conf /etc/nginx/conf.d/forest.conf\nCOPY dist /usr/share/nginx/html\n' > "$tmp/Dockerfile"
docker build -q -t forest-nginx-check "$tmp" >/dev/null || { echo "✗ Image-Build fehlgeschlagen"; exit 1; }
docker rm -f forest-nginx-check >/dev/null 2>&1
docker run -d --name forest-nginx-check --network host forest-nginx-check >/dev/null || exit 1
sleep 1
rc=0; B=http://127.0.0.1:18080
js=$(ls dist/assets/index-*.js | head -1 | xargs basename); css=$(ls dist/assets/index-*.css | head -1 | xargs basename)
expect() { got=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$B$1"); if [[ "$got" == $2* ]]; then echo "  ✓ $1 → $got"; else echo "  ✗ $1 → $got (erwartet $2)"; rc=1; fi; }
expect /                       "200 text/html"
expect /assets/$js             "200 application/javascript"
expect /assets/$css            "200 text/css"
expect /manifest.webmanifest   "200 application/manifest+json"
expect /sw.js                  "200 application/javascript"
expect /icon-192.png           "200 image/png"
expect /impressum.html         "200 text/html"
expect /gibtsnicht             "404"
h=$(curl -sI $B/)
for k in Content-Security-Policy Permissions-Policy Strict-Transport-Security X-Frame-Options; do
  if grep -qi "^$k:" <<<"$h"; then echo "  ✓ Header $k"; else echo "  ✗ Header $k fehlt"; rc=1; fi
done
h2=$(curl -sI $B/manifest.webmanifest)
grep -qi "^Content-Security-Policy:" <<<"$h2" && echo "  ✓ Header auch auf Unterseiten" || { echo "  ✗ Header fehlen auf /manifest.webmanifest"; rc=1; }
docker rm -f forest-nginx-check >/dev/null; rm -rf "$tmp"
[ $rc -eq 0 ] && echo "✓ nginx im Container ok"
exit $rc
