// Identity documents: upload (encrypt) / view (decrypt, audited) / purge (retention). Plaintext never stored or cached.
import { decrypt, encrypt } from "../_shared/encryption.ts";
import { callerClient, json, serviceClient } from "../_shared/supabase.ts";

const MAX = 10 * 1024 * 1024;
const noStore = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" };

/** Real content type from magic bytes; the client-declared type is ignored. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

const bearer = (req: Request) => (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");

Deno.serve(async (req) => {
  const admin = serviceClient();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const caller = callerClient(req);
    const { data, error } = await caller.schema("stay").rpc("identity_doc_for_read", { p_id: url.searchParams.get("id") });
    if (error) return json({ code: error.message }, error.message === "FORBIDDEN" ? 403 : error.message === "NOT_FOUND" ? 410 : 400);
    const d = data as { path: string; keyId: string; iv: string; mime: string };
    const { data: blob, error: dl } = await admin.storage.from("identity").download(d.path);
    if (dl || !blob) return json({ code: "UPSTREAM_UNAVAILABLE" }, 503);
    const plain = await decrypt(new Uint8Array(await blob.arrayBuffer()), d.keyId, d.iv, d.path);
    return new Response(plain, { headers: { ...noStore, "Content-Type": d.mime, "Content-Disposition": "inline" } });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  if ((req.headers.get("Content-Type") ?? "").includes("application/json")) {
    // Retention purge: service role only (cron). The gate is a service-only RPC executed with the caller's key.
    const { data: due, error: denied } = await callerClient(req).schema("stay").rpc("identity_docs_due");
    if (denied) return json({ code: "FORBIDDEN" }, 403);
    const body = await req.json();
    if (body.action !== "purge") return json({ code: "VALIDATION" }, 400);
    let purged = 0;
    for (const d of (due ?? []) as { id: string; object_path: string }[]) {
      const { error } = await admin.storage.from("identity").remove([d.object_path]);
      await admin.schema("stay").rpc("identity_doc_mark", { p_id: d.id, p_ok: !error, p_error: error?.message ?? null });
      if (!error) purged++;
    }
    return json({ purged });
  }

  // Upload by staff with identity.capture at the booking's location.
  const caller = callerClient(req);
  const { data: claims } = await caller.auth.getClaims(bearer(req));
  if (!claims?.claims) return json({ code: "UNAUTHENTICATED" }, 401);
  const form = await req.formData().catch(() => null);
  const bookingId = String(form?.get("bookingId") ?? "");
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ code: "VALIDATION" }, 400);
  if (file.size > MAX) return json({ code: "VALIDATION", message: "Tệp tối đa 10MB" }, 400);
  const { data: booking } = await admin.schema("stay").from("bookings").select("entity_id, location_id").eq("id", bookingId).maybeSingle();
  if (!booking) return json({ code: "NOT_FOUND" }, 404);
  const { data: allowed } = await caller.schema("core").rpc("has_permission", { p_action: "identity.capture", p_entity: booking.entity_id, p_location: booking.location_id });
  if (!allowed) return json({ code: "FORBIDDEN" }, 403);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniff(bytes);
  if (!mime) return json({ code: "VALIDATION", message: "Chỉ nhận ảnh JPEG/PNG/WebP hoặc PDF" }, 400);

  const path = `${booking.location_id}/${crypto.randomUUID()}.bin`;
  const enc = await encrypt(bytes, path);
  const { error: up } = await admin.storage.from("identity").upload(path, enc.data, { contentType: "application/octet-stream", upsert: false });
  if (up) return json({ code: "UPSTREAM_UNAVAILABLE" }, 503);
  const { data: id, error } = await admin.schema("stay").rpc("identity_doc_register", {
    p_booking: bookingId, p_path: path, p_key_id: enc.kid, p_iv: enc.iv, p_mime: mime, p_bytes: bytes.length, p_actor: claims.claims.sub,
  });
  if (error) {
    await admin.storage.from("identity").remove([path]);
    return json({ code: "UPSTREAM_UNAVAILABLE" }, 503);
  }
  return new Response(JSON.stringify({ id }), { headers: { ...noStore, "Content-Type": "application/json" } });
});
