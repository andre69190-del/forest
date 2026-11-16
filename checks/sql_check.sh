#!/bin/bash
# BIOGLOW Forest — deploy/supabase_forest.sql in echtem Postgres prüfen (nur wenn Docker verfügbar):
# zweimal einspielen (idempotent) + RLS-/Unveränderlichkeits-Szenarien (checks/sql/test_forest.sql).
cd "$(dirname "$0")/.." || exit 1
if ! docker info >/dev/null 2>&1; then echo "Docker nicht verfügbar – Check übersprungen"; exit 0; fi
docker rm -f forest-sql-check >/dev/null 2>&1
docker run -d --name forest-sql-check --network host -e POSTGRES_PASSWORD=x -e PGPORT=55432 postgres:16-alpine >/dev/null || exit 1
for i in $(seq 1 40); do docker exec forest-sql-check pg_isready -p 55432 -U postgres >/dev/null 2>&1 && break; sleep 0.5; done
sleep 1
P="docker exec -i forest-sql-check psql -q -p 55432 -U postgres -v ON_ERROR_STOP=1"
rc=0
$P < checks/sql/stub_supabase.sql >/dev/null || rc=1
$P < deploy/supabase_forest.sql >/dev/null 2>&1 || { echo "✗ supabase_forest.sql (1. Lauf) fehlgeschlagen"; $P < deploy/supabase_forest.sql 2>&1 | tail -3; rc=1; }
$P < deploy/supabase_forest.sql >/dev/null 2>&1 || { echo "✗ supabase_forest.sql nicht idempotent"; rc=1; }
[ $rc -eq 0 ] && echo "  ✓ Schema eingespielt (2× – idempotent)"
out=$($P < checks/sql/test_forest.sql 2>&1) || rc=1
echo "$out" | grep -oE "OK .*|ALLE SQL-TESTS BESTANDEN|ERROR.*|FEHLER.*" | sed 's/^/  /'
docker rm -f forest-sql-check >/dev/null
[ $rc -eq 0 ] && echo "✓ SQL ok" || echo "✗ SQL-Befunde"
exit $rc
