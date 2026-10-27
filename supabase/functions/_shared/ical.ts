// iCal parsing for OTA feeds (Deno Edge + Node tests). Output carries no guest data: uid + local dates only.
import ICAL from "npm:ical.js@2.2.1";

export type FeedEvent = { uid: string; start: string; end: string; cancelled: boolean };

const DAY = 86_400_000;

/** Local calendar date (YYYY-MM-DD) of an instant in a timezone. */
function localDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

function toLocal(t: ICAL.Time, tz: string): string {
  if (t.isDate) return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
  return localDate(t.toJSDate().getTime(), tz);
}

/**
 * Parse a feed into busy [start, end) local-date intervals within [today, today + horizon).
 * - DATE values: DTEND is exclusive (as in RFC 5545); missing DTEND = one night.
 * - DATE-TIME values (TZID or UTC) are mapped to dates in the location timezone.
 * - Same UID: highest SEQUENCE wins. RRULE expanded only inside the horizon.
 * - UIDs exported by ZSOPO itself ("zsopo-") are ignored to avoid loops.
 * Throws on malformed input so callers keep the last good snapshot.
 */
export function parseIcs(text: string, o: { now: Date; horizonDays: number; tz: string }): { events: FeedEvent[] } {
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== "vcalendar") throw new Error("not a VCALENDAR");
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const today = localDate(o.now.getTime(), o.tz);
  const horizon = localDate(o.now.getTime() + o.horizonDays * DAY, o.tz);
  const best = new Map<string, { seq: number; ev: FeedEvent[] }>();

  for (const vevent of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(vevent);
    if (!ev.uid) throw new Error("VEVENT without UID");
    if (ev.uid.startsWith("zsopo-")) continue;
    if (!ev.startDate) throw new Error(`VEVENT ${ev.uid} without DTSTART`);
    const cancelled = String(vevent.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";
    const seq = Number(ev.sequence ?? 0);

    const occurrences: FeedEvent[] = [];
    const push = (start: ICAL.Time, end: ICAL.Time | null, uid: string) => {
      const s = toLocal(start, o.tz);
      let e = end ? toLocal(end, o.tz) : s;
      if (e <= s) e = new Date(Date.parse(`${s}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
      if (e > today && s < horizon) occurrences.push({ uid, start: s, end: e, cancelled });
    };

    if (ev.isRecurring()) {
      const it = ev.iterator();
      for (let next = it.next(), n = 0; next && n < 1000; next = it.next(), n++) {
        const occ = ev.getOccurrenceDetails(next);
        if (toLocal(occ.startDate, o.tz) >= horizon) break;
        push(occ.startDate, occ.endDate, `${ev.uid}#${toLocal(occ.startDate, o.tz)}`);
      }
    } else {
      push(ev.startDate, ev.endDate ?? null, ev.uid);
    }

    const prev = best.get(ev.uid);
    if (!prev || seq >= prev.seq) best.set(ev.uid, { seq, ev: occurrences });
  }
  return { events: [...best.values()].flatMap((b) => b.ev).sort((a, b) => a.start.localeCompare(b.start) || a.uid.localeCompare(b.uid)) };
}
