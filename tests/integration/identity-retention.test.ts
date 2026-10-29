import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { API_URL, E1, L1, PUBLISHABLE_KEY, USERS, clientFor, db, seedRoom, sql, SERVICE_KEY } from "./helpers";

afterAll(() => db.end());
const FN = `${API_URL}/functions/v1/identity-docs`;
// Minimal JPEG: SOI marker + random payload + EOI.
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(2048), Buffer.from([0xff, 0xd9])]);

async function booking() {
  const room = (await seedRoom()).id;
  const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status) values ($1, $2, 'stay', 'confirmed') returning id`, [E1, L1]);
  const [b] = await sql<{ id: string }>(
    `insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults) values ($1, $2, $3, $4, current_date, current_date + 1, 'confirmed', 2) returning id`, [E1, L1, o!.id, room]);
  return b!.id;
}
const tokenOf = async (u: { email: string }) => (await (await clientFor(u)).auth.getSession()).data.session!.access_token;

async function upload(token: string, bookingId: string, file: Buffer, type = "image/jpeg") {
  const form = new FormData();
  form.set("bookingId", bookingId);
  form.set("file", new Blob([file], { type }), "cccd.jpg");
  return fetch(FN, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: PUBLISHABLE_KEY }, body: form });
}

describe("giấy tờ tùy thân mã hóa, quyền xem, xóa sau 30 ngày", () => {
  it("lễ tân tải lên -> lưu ciphertext; buồng phòng bị từ chối; lễ tân xem được bản gốc và có audit", async () => {
    const b = await booking();
    const file = jpeg();
    const fd = await tokenOf(USERS.frontDesk);
    const res = await upload(fd, b, file);
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const [doc] = await sql<{ object_path: string }>(`select object_path from stay.identity_documents where id = $1`, [id]);
    const raw = await fetch(`${API_URL}/storage/v1/object/identity/${doc!.object_path}`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    const stored = Buffer.from(await raw.arrayBuffer());
    expect(stored.length).toBeGreaterThan(file.length);
    expect(stored.includes(file.subarray(4, 64))).toBe(false);

    const hk = await tokenOf(USERS.housekeeping);
    expect((await fetch(`${FN}?id=${id}`, { headers: { Authorization: `Bearer ${hk}`, apikey: PUBLISHABLE_KEY } })).status).toBe(403);
    expect((await upload(hk, b, jpeg())).status).toBe(403);

    const view = await fetch(`${FN}?id=${id}`, { headers: { Authorization: `Bearer ${fd}`, apikey: PUBLISHABLE_KEY } });
    expect(view.status).toBe(200);
    expect(view.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await view.arrayBuffer()).equals(file)).toBe(true);
    expect(await sql(`select 1 from core.audit_logs where action = 'identity.view' and subject_id = $1`, [id])).toHaveLength(1);
  });

  it("từ chối file không phải ảnh/PDF thật", async () => {
    const fd = await tokenOf(USERS.frontDesk);
    expect((await upload(fd, await booking(), Buffer.from("<script>alert(1)</script>"), "image/jpeg")).status).toBe(400);
  });

  it("quá 30 ngày: job purge xóa file và khóa tham chiếu, audit không chứa bản rõ", async () => {
    const b = await booking();
    const fd = await tokenOf(USERS.frontDesk);
    const { id } = await (await upload(fd, b, jpeg())).json();
    const [doc] = await sql<{ object_path: string }>(`select object_path from stay.identity_documents where id = $1`, [id]);
    await sql(`update stay.identity_documents set captured_at = now() - interval '31 days', expires_at = now() - interval '1 day' where id = $1`, [id]);
    const purge = await fetch(FN, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ action: "purge" }) });
    expect(purge.status).toBe(200);
    const [after] = await sql<{ purged_at: string | null; object_path: string | null; iv: string | null }>(`select purged_at, object_path, iv from stay.identity_documents where id = $1`, [id]);
    expect(after!.purged_at).not.toBeNull();
    expect(after!.object_path).toBeNull();
    expect(after!.iv).toBeNull();
    expect(await sql(`select 1 from storage.objects where bucket_id = 'identity' and name = $1`, [doc!.object_path])).toHaveLength(0);
    expect((await fetch(`${FN}?id=${id}`, { headers: { Authorization: `Bearer ${fd}`, apikey: PUBLISHABLE_KEY } })).status).toBe(410);
    const audits = await sql<{ diff: unknown }>(`select diff from core.audit_logs where subject_id = $1 and action = 'identity.purge'`, [id]);
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits[0]!.diff)).not.toContain(doc!.object_path);
    void randomUUID;
  });
});
