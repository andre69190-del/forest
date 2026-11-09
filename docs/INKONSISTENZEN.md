# Befunde in den bestehenden Projekten (Prüfung 09.11.2026)

Nur festgehalten, nichts daran geändert.

| Projekt | Befund | Vorschlag |
| --- | --- | --- |
| ARDOC | Handbuch, AGENTS.md, Projektdoku nennen noch Vercel / `ardoc-rho.vercel.app`; live ist `arcdoc.arndt-software.de` über Coolify | Doku auf Coolify umstellen |
| ARDOC | Name uneinheitlich: Repo `ardoc`, Domain `arcdoc`, Text „ARDOC (ArcDoc)“ | einen Namen festlegen |
| ARDOC | `netlify.toml` liegt noch im Repo | entfernen |
| ARDOC | Dockerfile: keine Sicherheits-Header, SPA-Fallback liefert für jeden Pfad die App (GeoQuest/Polski wurden dafür schon korrigiert) | nginx-Config wie Polski Szlak |
| ARDOC | kein Änderungsprotokoll; Checks ohne i18n- und a11y-Prüfung | aus Polski Szlak übernehmen |
| GeoQuest | `vercel.json` liegt noch im Repo | entfernen |
| GeoQuest | kein Änderungsprotokoll | anlegen |
| alle | Permissions-Policy je Projekt verschieden (bewusst, aber nirgends dokumentiert) | in PLATTFORM-Doku festhalten |
| homepage | Datenschutzerklärung nennt nur netcup, nicht Cloudflare (Proxy verarbeitet IP-Adressen) | Cloudflare ergänzen (in forest schon drin) |
| homepage | Impressum-Geltungsbereich listet forest noch nicht | nach Go-Live ergänzen, Kachel auf der Startseite |
| Plattform | Stack uneinheitlich: Single-File (BIOGLOW, GeoQuest, Polski) vs. React (ARDOC, forest) | ok, aber in PLATTFORM-Doku begründen |

Positiv: einheitliche Kontaktadresse in allen Rechtstexten; `.env` in ARDOC nicht im Repo und enthält nur öffentliche Werte.
