#!/usr/bin/env bash
# Prueba las migraciones de Supabase contra un Postgres limpio (15 o superior).
# Usa las variables estándar de Postgres: PGHOST, PGPORT, PGUSER, PGPASSWORD.
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres bash scripts/test-db.sh
# Crea una base temporal, aplica stub + migraciones + seed + pruebas + marcas reales, y la borra.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGUSER="${PGUSER:-postgres}"
export PGHOST="${PGHOST:-localhost}"
DB="platto_test_$$"

psql -d postgres -qX -c "create database $DB" >/dev/null
cleanup() { psql -d postgres -qX -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

run() {
  echo "→ $(basename "$1")"
  psql -d "$DB" -qX -v ON_ERROR_STOP=1 -f "$1"
}

run "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f"; done
run "$ROOT/supabase/seed.sql"
for f in "$ROOT"/supabase/tests/[1-9]*.test.sql; do run "$f"; done
# Marcas reales: después de las pruebas, que cuentan solo los tres restaurantes de ejemplo.
for f in "$ROOT"/supabase/seed_*.sql; do run "$f"; done
run "$ROOT/supabase/tests/brands.check.sql"

echo "✓ Base de datos: todas las pruebas pasaron"
