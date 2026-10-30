// Public iCal export per OTA connection: /functions/v1/ical-export?token=... Busy intervals only, no guest data.
import { serviceClient } from "../_shared/supabase.ts";

const fold = (d: string) => d.replaceAll("-", "");

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (token.length < 32) return new Response("unauthorized", { status: 401 });
  const { data, error } = await serviceClient().schema("stay").rpc("export_busy", { p_token: token });
  if (error) return new Response("unavailable", { status: 503 });
  if (!data?.length) {
    // Unknown/rotated token and an empty calendar both look the same unless the token matches a feed.
    const { count } = await serviceClient().schema("stay").from("calendar_feeds").select("id", { count: "exact", head: true })
      .eq("export_token_hint", token.slice(0, 4));
    if (!count) return new Response("unauthorized", { status: 401 });
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ZSOPO//Stay//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of data ?? []) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@zsopo`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${fold(e.starts_on)}`, `DTEND;VALUE=DATE:${fold(e.ends_on)}`, "SUMMARY:Không nhận khách", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=60", "X-Robots-Tag": "noindex" },
  });
});
