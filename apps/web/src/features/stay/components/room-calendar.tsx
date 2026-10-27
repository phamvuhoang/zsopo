"use client";

import { roomCalendar, type CalendarDay } from "@zsopo/api";
import { formatVnd } from "@zsopo/core";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Availability and nightly price per month (live, uncached). Selection hands off to booking when enabled. */
export function RoomCalendar({ roomId, bookingHref }: { roomId: string; bookingHref?: string }) {
  const [month, setMonth] = useState(() => todayVn().slice(0, 7));
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});

  useEffect(() => {
    let live = true;
    const from = `${month}-01`;
    const end = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 1));
    roomCalendar(createClient(), roomId, from, iso(end)).then((r) => {
      if (!live) return;
      if (r.ok) {
        setDays(r.data);
        setError(false);
      } else setError(true);
    });
    return () => {
      live = false;
    };
  }, [roomId, month]);

  const byDate = useMemo(() => new Map((days ?? []).map((d) => [d.date, d])), [days]);
  const first = new Date(`${month}-01T00:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const shift = (n: number) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1));
    setDays(null);
    setMonth(iso(d).slice(0, 7));
  };

  const pick = (date: string) =>
    setRange((r) => (!r.from || r.to || date <= r.from ? { from: date } : { from: r.from, to: date }));
  const rangeOk = range.from && range.to && [...byDate.values()].filter((d) => d.date >= range.from! && d.date < range.to!).every((d) => d.available);

  return (
    <section aria-labelledby="lich-phong" className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <h2 id="lich-phong" className="text-lg font-semibold">
          Lịch trống tháng {month.slice(5)}/{month.slice(0, 4)}
        </h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} disabled={month <= todayVn().slice(0, 7)} className="min-h-11 rounded-md px-3 disabled:opacity-40" aria-label="Tháng trước">
            ‹
          </button>
          <button type="button" onClick={() => shift(1)} className="min-h-11 rounded-md px-3" aria-label="Tháng sau">
            ›
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">Chưa tải được lịch. Vui lòng thử lại.</p>}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs" aria-busy={days === null}>
        {WD.map((w) => (
          <div key={w} className="py-1 font-medium text-[var(--ink-3)]">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const d = byDate.get(date);
          const selected = date === range.from || date === range.to || (range.from && range.to && date > range.from && date < range.to);
          return (
            <button
              key={date}
              type="button"
              disabled={!d?.available && date !== range.from}
              onClick={() => pick(date)}
              aria-pressed={!!selected}
              aria-label={`${i + 1}/${month.slice(5)}${d?.available ? `, còn phòng, ${formatVnd(d.price!)}` : ", không nhận đặt"}`}
              className={`min-h-11 rounded-md p-1 ${selected ? "bg-[var(--accent)] text-[var(--on-accent)]" : d?.available ? "hover:bg-[var(--accent-soft)]" : "text-[var(--ink-3)] line-through"}`}
            >
              <span className="block text-sm">{i + 1}</span>
              {d?.available && d.price && <span className="block text-[10px] whitespace-nowrap">{Math.round(Number(d.price) / 1000)}k</span>}
            </button>
          );
        })}
      </div>
      {range.from && range.to && (
        <p className="mt-3 text-sm" role="status">
          {rangeOk ? `Đã chọn ${range.from} đến ${range.to}.` : "Khoảng ngày có đêm không còn phòng. Vui lòng chọn lại."}
        </p>
      )}
      {bookingHref && rangeOk && (
        <a href={`${bookingHref}&nhan=${range.from}&tra=${range.to}`} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">
          Đặt phòng các ngày này
        </a>
      )}
    </section>
  );
}
