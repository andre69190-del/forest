#!/bin/bash
# BIOGLOW Forest – alle Checks und Tests nacheinander (Muster: Polski Szlak / ARDOC checks/run_all.sh).
#   bash checks/run_all.sh          -> Build + Unit-Tests + statische Checks
#   bash checks/run_all.sh --ui     -> zusätzlich Browser-Test (Python-Playwright + Chromium)
cd "$(dirname "$0")/.." || exit 1
rc=0
run() { echo ""; echo "############################################################"; echo "# $1"; echo "############################################################"; shift; "$@" || rc=1; }
run "Build"                    npm run build --silent
run "Unit-Tests (Geo, Signatur, Forst)" npx vitest run
run "i18n (alle Sprachen)"     node    checks/i18n_check.mjs
run "Feature-Verifizierung"    bash    checks/check_features.sh
run "Safety / Security"        python3 checks/safety_check.py
run "WCAG-Kontrast"            python3 checks/contrast_check.py
run "Performance / Größe"      python3 checks/perf_check.py
if [ "$1" = "--ui" ]; then run "Browser-Test (Playwright)" python3 tests/ui_test.py; fi
echo ""; echo "############################################################"
[ "$rc" -eq 0 ] && echo "# GESAMT: alles bestanden ✓" || echo "# GESAMT: mindestens ein Check meldet Befunde (siehe oben)"
echo "############################################################"
exit $rc
