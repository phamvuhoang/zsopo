#!/usr/bin/env bash
# Local restore drill: dump business schemas, restore into an isolated database, compare invariants,
# check the anti-double-booking constraint survived. Usage: scripts/restore-drill.sh [db container]
set -euo pipefail
C=${1:-supabase_db_zsopo}
src() { docker exec "$C" psql -U postgres -d postgres -qAt -v ON_ERROR_STOP=1 "$@"; }
dst() { docker exec "$C" psql -U postgres -d restore_drill -qAt "$@"; }
start=$(date +%s)
docker exec "$C" psql -U postgres -qAt -c "drop database if exists restore_drill" -c "create database restore_drill" >/dev/null
# Platform objects the business schemas reference (Supabase provides them in a real project restore).
for s in "create extension if not exists btree_gist" "create schema extensions" "create extension pgcrypto with schema extensions" \
  "create extension unaccent with schema extensions" "create extension \"uuid-ossp\" with schema extensions" "create schema auth" \
  "create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz)" \
  "create function auth.uid() returns uuid language sql as 'select null::uuid'" "create function auth.jwt() returns jsonb language sql as 'select null::jsonb'" \
  "do \$\$ begin create role anon; exception when duplicate_object then null; end \$\$" "do \$\$ begin create role authenticated; exception when duplicate_object then null; end \$\$" \
  "do \$\$ begin create role service_role; exception when duplicate_object then null; end \$\$"; do dst -c "$s" >/dev/null; done
docker exec "$C" sh -c "psql -U postgres -d postgres -qAt -c 'copy (select id, email, email_confirmed_at from auth.users) to stdout' | psql -U postgres -d restore_drill -qAt -c 'copy auth.users from stdin'"
docker exec "$C" pg_dump -U postgres -d postgres -Fc --schema=core --schema=commerce --schema=stay --schema=shop --schema=content --schema=crm --schema=ops_config -f /tmp/drill.dump
docker exec "$C" pg_restore -U postgres -d restore_drill --no-owner --no-privileges /tmp/drill.dump > /tmp/restore-drill.log 2>&1 || true
end=$(date +%s)
Q="select (select count(*) from commerce.orders), (select count(*) from commerce.ledger_entries), (select coalesce(sum(amount),0) from commerce.ledger_entries), (select count(*) from stay.bookings), (select count(*) from stay.room_allocations where active), (select count(*) from shop.inventory), (select count(*) from stay.identity_documents where purged_at is null), (select count(*) from pg_constraint where contype = 'x')"
a=$(src -c "$Q"); b=$(dst -c "$Q")
echo "restore errors: $(grep -c 'error:' /tmp/restore-drill.log || true) (expected only references to platform schemas: vault/cron/net/storage)"
grep 'error:' /tmp/restore-drill.log | sed 's/.*ERROR: *//' | cut -c1-90 | sort | uniq -c | head -8 || true
echo "invariants orders|ledger_lines|ledger_sum|bookings|active_allocs|inventory|live_identity_docs|exclusion_constraints"
echo "source:   $a"; echo "restored: $b"; echo "elapsed:  $((end - start))s"
dup=$(dst -c "insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id) select entity_id, location_id, room_id, occupied_range, 'maintenance', gen_random_uuid() from stay.room_allocations where active limit 1" 2>&1 || true)
echo "double-booking guard: $(echo "$dup" | grep -q 'conflicting key' && echo enforced || echo "NOT ENFORCED: $dup")"
[ "$a" = "$b" ] && echo "RESULT: invariants match" || { echo "RESULT: MISMATCH"; exit 1; }
