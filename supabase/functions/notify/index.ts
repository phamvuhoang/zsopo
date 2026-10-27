// Outbox worker: claim due jobs, render allow-listed templates, deliver, record outcome.
// Email: Resend in staging/production (RESEND_API_KEY), Mailpit locally (MAILPIT_URL). Zalo: disabled until OA credentials exist.
import { callerClient, json, serviceClient } from "../_shared/supabase.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const FROM = Deno.env.get("MAIL_FROM") ?? "ZSOPO <no-reply@example.test>";
const ZALO_ENABLED = !!Deno.env.get("ZALO_OA_TOKEN");

type Rendered = { skip?: string; disabled?: string; channels?: string[]; to?: string; template?: string; vars?: Record<string, unknown> };

const vnd = (v: unknown) => String(v ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function fill(body: string, vars: Record<string, string>, allowed: string[]): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => (allowed.includes(k) ? (vars[k] ?? "") : ""));
}

async function sendEmail(to: string, subject: string, text: string, dedupe: string): Promise<{ provider: string; id?: string; error?: string }> {
  const resend = Deno.env.get("RESEND_API_KEY");
  if (resend) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json", "Idempotency-Key": dedupe },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
    });
    const body = await r.json().catch(() => ({}));
    return r.ok ? { provider: "resend", id: body.id } : { provider: "resend", error: `${r.status} ${body.message ?? ""}`.trim() };
  }
  const mailpit = Deno.env.get("MAILPIT_URL");
  if (mailpit) {
    const r = await fetch(`${mailpit}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ From: { Email: FROM.match(/<(.+)>/)?.[1] ?? FROM, Name: "ZSOPO" }, To: [{ Email: to }], Subject: subject, Text: text }),
    });
    const body = await r.json().catch(() => ({}));
    return r.ok ? { provider: "mailpit", id: body.ID } : { provider: "mailpit", error: `${r.status}` };
  }
  return { provider: "none", error: "Chưa cấu hình nhà cung cấp email" };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const db = serviceClient();
  // Gate: claim_outbox is executable by the service role only, so a signed-in customer's JWT is refused here.
  const { data: jobs, error } = await callerClient(req).schema("core").rpc("claim_outbox", { p_limit: 20, p_lease: "2 minutes", p_worker: crypto.randomUUID() });
  if (error) return json({ code: "FORBIDDEN" }, 403);

  const results: { id: string; status: string }[] = [];
  for (const job of jobs ?? []) {
    const done = async (status: string, providerId: string | null, err: string | null) => {
      await db.schema("core").rpc("complete_outbox", { p_id: job.id, p_status: status, p_provider_id: providerId, p_error: err });
      results.push({ id: job.id, status });
    };
    try {
      const { data: r } = await db.schema("core").rpc("render_outbox", { p_id: job.id });
      const m = r as Rendered;
      if (m.skip) {
        await db.schema("core").rpc("log_delivery", { p_outbox: job.id, p_channel: "email", p_provider: "none", p_recipient: null, p_status: "skipped", p_provider_id: null, p_error: m.skip });
        await done("skipped", null, m.skip);
        continue;
      }
      if (m.disabled) {
        await db.schema("core").rpc("log_delivery", { p_outbox: job.id, p_channel: "email", p_provider: "none", p_recipient: null, p_status: "disabled", p_provider_id: null, p_error: m.disabled });
        await done("disabled", null, m.disabled);
        continue;
      }
      const raw = m.vars ?? {};
      const code = String(raw.orderCode ?? "");
      const vars: Record<string, string> = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, k === "paid" || k === "due" ? vnd(v) : String(v ?? "")]));
      vars.link = raw.guestToken ? `${SITE_URL}/api/guest?t=${encodeURIComponent(String(raw.guestToken))}&next=/dat-phong/${code}` : "";
      vars.handbookUrl = `${SITE_URL}/handbook/da-lat`;
      if (raw.unsubscribeToken) vars.unsubscribeUrl = `${SITE_URL}/huy-nhan-thu?t=${encodeURIComponent(String(raw.unsubscribeToken))}`;
      if (raw.productUrl) vars.productUrl = `${SITE_URL}${raw.productUrl}`;
      if (raw.confirmToken) {
        vars.confirmUrl = `${SITE_URL}/xac-nhan-ban-tin?t=${encodeURIComponent(String(raw.confirmToken))}`;
        vars.unsubscribeUrl = `${SITE_URL}/huy-ban-tin?t=${encodeURIComponent(String(raw.confirmToken))}`;
      }
      delete vars.guestToken;
      delete vars.unsubscribeToken;
      delete vars.confirmToken;

      const { data: tpl } = await db.schema("ops_config").from("notification_templates").select("subject, body, allowed_vars")
        .eq("key", m.template!).eq("channel", "email").eq("active", true).maybeSingle();
      if (!tpl) {
        await done("failed", null, `Thiếu mẫu ${m.template}`);
        continue;
      }
      const sent = await sendEmail(m.to!, fill(tpl.subject, vars, tpl.allowed_vars), fill(tpl.body, vars, tpl.allowed_vars), job.dedupe_key);
      await db.schema("core").rpc("log_delivery", { p_outbox: job.id, p_channel: "email", p_provider: sent.provider, p_recipient: m.to, p_status: sent.error ? "failed" : "sent", p_provider_id: sent.id ?? null, p_error: sent.error ?? null });
      if (m.channels?.includes("zalo")) {
        await db.schema("core").rpc("log_delivery", { p_outbox: job.id, p_channel: "zalo", p_provider: "zalo_oa", p_recipient: null,
          p_status: ZALO_ENABLED ? "skipped" : "disabled", p_provider_id: null, p_error: ZALO_ENABLED ? "Zalo ZNS chưa có mẫu được duyệt" : "Zalo OA chưa được cấp, chỉ gửi email" });
      }
      await done(sent.error ? "failed" : "sent", sent.id ?? null, sent.error ?? null);
    } catch (e) {
      await done("failed", null, e instanceof Error ? e.message.slice(0, 300) : "unknown");
    }
  }
  return json({ processed: results.length, results });
});
