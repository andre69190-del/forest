# Veröffentlichen (Coolify, automatisch)

Ablauf: Änderung → `publish.bat` → GitHub → Coolify baut das Docker-Image (inkl. Unit-Tests) → live.

## Einmalig einrichten
1. GitHub: privates, leeres Repo `andre69190-del/forest`.
2. Coolify: New Resource → Private Repository → `andre69190-del/forest`, Branch `main`,
   Build Pack **Dockerfile**, Port **80**, Domain `https://forest.arndt-software.de`
   (Wildcard-DNS + Traefik-TLS – kein DNS-Eintrag nötig).
3. Auto-Deploy: Quelle über GitHub App → in der Ressource „Auto Deploy“ an.
   Sonst Webhook: Coolify → Webhooks → GitHub-URL + Secret; GitHub → Settings → Webhooks →
   Payload-URL, `application/json`, Secret, „Just the push event“.

## Jede Änderung
- `bash checks/run_all.sh` (Git Bash) bzw. mindestens `npm run build` und `npm test`
- `publish.bat` doppelklicken (baut, testet, committet, pusht)
- Nach dem Deploy auf dem Handy prüfen: Kamera, GPS, Offline (Flugmodus), Sprache

## Kontrolle nach Go-Live
- `https://forest.arndt-software.de/gibtsnicht` → 404 (nicht die App)
- Response-Header enthalten Content-Security-Policy und `Permissions-Policy: camera=(self) …`
- Homepage: Kachel + Impressum-Geltungsbereich ergänzen
