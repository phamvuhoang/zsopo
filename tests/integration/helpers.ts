// Integration test helpers: real Postgres (local Supabase), real JWTs, no mocked locks/RLS.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";
import pg from "pg";
import { createShopOrder, transitionFulfillment } from "../../packages/api/src/shop";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";

export const API_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:56421";
export const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
// Service role key for calling Edge Functions from tests: never hard-coded, read from `supabase status -o env` (SECRET_KEY) or CI env.
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? (() => { throw new Error("Set SUPABASE_SERVICE_ROLE_KEY from `pnpm exec supabase status -o env` (SECRET_KEY)"); })();
// Local JWT secret for minting aal2 tokens: read from `supabase status -o env` (JWT_SECRET) or CI env, never hard-coded.
const jwtSecret = () => process.env.SUPABASE_JWT_SECRET ?? (() => { throw new Error("Set SUPABASE_JWT_SECRET from `pnpm exec supabase status -o env` (JWT_SECRET)"); })();
const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
const PASSWORD = "zsopo-local-1";

export const E1 = "e0000000-0000-4000-8000-000000000001";
export const E2 = "e0000000-0000-4000-8000-000000000002";
export const L1 = "c0000000-0000-4000-8000-000000000001";
export const L2 = "c0000000-0000-4000-8000-000000000002";
export const L3 = "c0000000-0000-4000-8000-000000000003";

const u = (n: string, email: string) => ({ id: `a0000000-0000-4000-8000-0000000000${n}`, email });
// Seeded in supabase/seed.sql (seedTenant): two entities, two locations in E1, one role per user.
export const USERS = {
  frontDesk: u("01", "le-tan@example.test"),
  housekeeping: u("02", "buong-phong@example.test"),
  manager: u("03", "quan-ly@example.test"),
  editor: u("04", "bien-tap@example.test"),
  finance: u("05", "tai-chinh@example.test"),
  superAdmin: u("06", "admin@example.test"),
  frontDesk2: u("07", "le-tan-2@example.test"),
  frontDeskB: u("08", "le-tan-b@example.test"),
  housekeeping2: u("09", "buong-phong-2@example.test"),
};

export const db = new pg.Pool({ connectionString: DB_URL, max: 8 });

/** Superuser SQL for fixtures/assertions (bypasses RLS, never used by app code). */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query(text, params)).rows as T[];
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

export const anonClient = (): SupabaseClient => createClient(API_URL, PUBLISHABLE_KEY, noPersist);

/** Signs in a seeded staff user with a real password grant; the returned client carries that JWT. */
export async function clientFor(user: { email: string }): Promise<SupabaseClient> {
  const c = createClient(API_URL, PUBLISHABLE_KEY, noPersist);
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: PASSWORD });
  if (error) throw new Error(`sign-in ${user.email}: ${error.message}`);
  return c;
}

/** A client whose JWT is a correctly signed aal2 token (what a user gets after TOTP), without running the TOTP flow. */
export function aal2ClientFor(user: { id: string; email: string }): SupabaseClient {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", aal: "aal2", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  const token = `${head}.${createHmac("sha256", jwtSecret()).update(head).digest("base64url")}`;
  return createClient(API_URL, PUBLISHABLE_KEY, { ...noPersist, global: { headers: { Authorization: `Bearer ${token}` } } });
}

/** Runs one SQL call as `user` with an aal2 claim (for functions that need MFA; superuser connection, claims set locally). */
export const asAal2 = (user: string, call: string, params: unknown[]) =>
  sql(`select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated', 'aal', 'aal2')::text, true), ${call}`, [user, ...params]);

const isoDay = (n: number) => new Date(Date.UTC(2031, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
let stayDay = Math.floor(Math.random() * 3000);

/** A held one-night stay on a fresh room (price default 1.000.000, so deposit_due is 300.000); optional services depend on the stay dates. */
export async function heldBooking(
  services: (stay: { arrival: string; departure: string }) => { serviceId: string; qty: number; scheduledAt: string }[] = () => [],
  opts: { price?: number } = {},
) {
  const room = (await seedRoom()).id;
  await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', $4)`, [E1, L1, room, opts.price ?? 1000000]);
  const stay = { arrival: isoDay((stayDay += 3)), departure: isoDay(stayDay + 1) };
  const client = anonClient();
  const q = await quoteStay(client, { roomId: room, ...stay, adults: 2, childrenAges: [], services: services(stay) });
  if (!q.ok) throw new Error(q.error.message);
  const h = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách Review", phone: "0900000099" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
  if (!h.ok) throw new Error(h.error.message);
  return { room, ...stay, ...h.data };
}

/** seedTenant: tenants come from seed.sql; returns their ids for readability in tests. */
export const seedTenant = () => ({ E1, E2, L1, L2, L3, USERS });

/** A fresh sellable room in L1 (unique code per call) so tests do not fight over seeded rooms. */
export async function seedRoom(opts: { sellable?: boolean; maxGuests?: number; location?: string; entity?: string } = {}) {
  const code = `T${Math.random().toString(36).slice(2, 8)}`;
  const [room] = await sql<{ id: string; slug: string }>(
    `insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, capacity_children, max_guests, sellable, status)
     values ($1, $2, $3, lower($3), 'Phòng thử ' || $3, 'Đôi tiêu chuẩn', 2, 1, $4, $5, 'published') returning id, slug`,
    [opts.entity ?? E1, opts.location ?? L1, code, opts.maxGuests ?? 3, opts.sellable ?? true],
  );
  return room!;
}

/** A published product with one variant and stock in the online warehouse. */
export async function seedSku(opts: { price?: bigint; onHand?: number } = {}) {
  const tag = Math.random().toString(36).slice(2, 8);
  const [card] = await sql<{ id: string }>(
    `insert into core.energy_cards(entity_id, title, purpose, origin, usage, status) values ($1, 'Thẻ ' || $2, 'Thử', 'Thử', 'Thử', 'published') returning id`,
    [E1, tag],
  );
  const [cat] = await sql<{ id: string }>(`select id from shop.categories order by sort limit 1`);
  const [product] = await sql<{ id: string }>(
    `insert into shop.products(entity_id, category_id, slug, name, energy_card_id, status) values ($1, $2, 'sp-' || $3, 'Sản phẩm ' || $3, $4, 'published') returning id`,
    [E1, cat!.id, tag, card!.id],
  );
  const [variant] = await sql<{ id: string }>(
    `insert into shop.product_variants(entity_id, product_id, sku, name, price) values ($1, $2, 'SKU-' || $3, 'Tiêu chuẩn', $4) returning id`,
    [E1, product!.id, tag, String(opts.price ?? 100000n)],
  );
  await sql(
    `insert into shop.inventory(entity_id, variant_id, warehouse_id, on_hand) values ($1, $2, '90000000-0000-4000-8000-000000000002', $3)`,
    [E1, variant!.id, opts.onHand ?? 1],
  );
  return { productId: product!.id, variantId: variant!.id };
}

/** Shop order helpers: place as an anonymous guest, move fulfillment as finance, read inventory. */
export const address = { name: "Khách Shop", phone: "0900000202", line1: "12 Đường Hoa", regionCode: "default" };
export const placeShop = (variantId: string, method: "cod" | "bank" = "cod") =>
  createShopOrder(anonClient(), { lines: [{ variantId, qty: 1 }], shippingAddress: address, method, idempotencyKey: randomUUID(), terms: true });
export const onHand = async (variantId: string) => (await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]))[0]!;
export async function move(orderId: string, to: string) {
  const [o] = await sql<{ version: number }>(`select version from commerce.orders where id = $1`, [orderId]);
  const r = await transitionFulfillment(await clientFor(USERS.finance), { orderId, to, expectedVersion: o!.version, tracking: "GHN1", note: "ok" });
  if (!r.ok) throw new Error(`${to}: ${r.error.message}`);
}

/** Retry an assertion block until it passes or times out (Vitest has no toPass). */
export async function eventually(fn: () => Promise<void>, timeoutMs = 10_000): Promise<void> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (Date.now() > end) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
