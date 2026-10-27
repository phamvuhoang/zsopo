// OTA import worker (every 15 minutes, or "sync now"). Fetch with SSRF guards, parse, reconcile in one DB transaction per feed.
import { parseIcs } from "../_shared/ical.ts";
import { json, serviceClient } from "../_shared/supabase.ts";

const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_HOSTS = ["airbnb.com", "airbnb.com.vn", "booking.com", "agoda.com", "expedia.com", "vrbo.com", "google.com"];

const isPrivate = (ip: string) =>
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) ||
  ip === "::1" || /^(fc|fd|fe80)/i.test(ip) || ip.startsWith("::ffff:");

/** HTTPS + allow-listed host + public DNS answers, re-checked on every redirect hop; bounded time and size. */
export async function safeFetch(url: string, allowedHosts: string[]): Promise<string> {
  let target = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    if (target.protocol !== "https:") throw new Error("blocked: https only");
    const host = target.hostname.toLowerCase();
    if (!allowedHosts.some((h) => host === h || host.endsWith(`.${h}`))) throw new Error(`blocked: host ${host} not allowed`);
    const ips = [...(await Deno.resolveDns(host, "A").catch(() => [])), ...(await Deno.resolveDns(host, "AAAA").catch(() => []))];
    if (!ips.length || ips.some(isPrivate)) throw new Error("blocked: private or unresolvable address");
    const res = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "ZSOPO-iCal/1.0" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      target = new URL(res.headers.get("location")!, target);
      continue;
    }
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error("blocked: feed too large");
      chunks.push(value);
    }
    return new TextDecoder().decode(new Uint8Array(chunks.flatMap((c) => [...c])));
  }
  throw new Error("blocked: too many redirects");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const db = serviceClient();
  const body = await req.json().catch(() => ({}));
  const { data: setting } = await db.schema("ops_config").from("runtime_settings").select("value").eq("key", "calendar.allowedHosts").maybeSingle();
  const allowed = (setting?.value as string[] | undefined) ?? DEFAULT_HOSTS;
  const { data: feeds, error } = await db.schema("stay").rpc("feeds_due", { p_interval: body.force ? "0 seconds" : "15 minutes" });
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const f of (feeds ?? []).filter((x: { id: string }) => !body.feedId || x.id === body.feedId)) {
    try {
      const text = await safeFetch(f.import_url, allowed);
      const { events } = parseIcs(text, { now: new Date(), horizonDays: f.horizon_days, tz: "Asia/Ho_Chi_Minh" });
      const { data } = await db.schema("stay").rpc("reconcile_feed", { p_feed: f.id, p_events: events, p_error: null });
      results.push({ id: f.id, ...data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      const { data } = await db.schema("stay").rpc("reconcile_feed", { p_feed: f.id, p_events: null, p_error: msg });
      results.push({ id: f.id, error: msg, ...data });
    }
  }
  return json({ feeds: results.length, results });
});
