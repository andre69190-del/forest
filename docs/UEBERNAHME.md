# Was aus welchem Projekt kommt

| Herkunft | Übernommen | Wo in forest |
| --- | --- | --- |
| ARDOC | Stack React/Vite/Dexie/Leaflet/jsPDF/PWA, Feld-Layout, Dockerfile-Muster | gesamtes Gerüst |
| ARDOC (geplant) | Sync + Gruppen/Rollen (RLS), Audit-Log, proj4, Shapefile, Plan-Digitalisierer, QR | Phase 1b/2 |
| BIOGLOW | GPS-Bestwert über watchPosition, Laplace-Schärfe, Foto-Coach-Idee, Missionen-Idee | src/lib/media.js |
| BIOGLOW (geplant) | KI-Artbestimmung (Pl@ntNet/iNaturalist), Darwin Core, Verschleierung | Phase 1b |
| GeoQuest | safety/contrast/perf-Checks, nginx-Header, 404 für unbekannte Pfade | checks/, deploy/ |
| Polski Szlak | run_all.sh-Aufbau, i18n-Check, ui_test.py, CLAUDE_SESSION_STARTER, Protokoll | checks/, tests/, docs/ |

**Bewusst anders:** Permissions-Policy erlaubt Kamera/GPS/Mikrofon (GeoQuest sperrt alles);
HashRouter statt SPA-Fallback (ARDOC liefert für jeden Pfad die App aus → schlecht für Google).
