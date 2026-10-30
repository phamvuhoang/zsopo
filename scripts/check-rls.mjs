// Fails if any table in an API-exposed schema lacks RLS, or a SECURITY DEFINER function lacks a fixed search_path
// or is executable by PUBLIC.
import pg from "pg";

const SCHEMAS = ["public", "core", "commerce", "stay", "shop", "content", "crm", "ops_config"];
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres" });
await client.connect();

const { rows: tables } = await client.query(
  `select n.nspname || '.' || c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r','p') and n.nspname = any($1) and not c.relrowsecurity order by 1`, [SCHEMAS]);
const { rows: fns } = await client.query(
  `select n.nspname || '.' || p.proname as name,
          coalesce(array_to_string(p.proconfig, ','), '') !~ 'search_path' as no_path,
          has_function_privilege('public', p.oid, 'execute') and p.proname not in ('has_permission','auth_has_role','is_staff_of') as public_exec
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.prosecdef and n.nspname = any($1)`, [SCHEMAS]);
await client.end();

const problems = [
  ...tables.map((t) => `RLS disabled: ${t.name}`),
  ...fns.filter((f) => f.no_path).map((f) => `SECURITY DEFINER without search_path: ${f.name}`),
  ...fns.filter((f) => f.public_exec).map((f) => `SECURITY DEFINER executable by PUBLIC: ${f.name}`),
];
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check:rls ok (${SCHEMAS.length} schemas, ${fns.length} definer functions)`);
