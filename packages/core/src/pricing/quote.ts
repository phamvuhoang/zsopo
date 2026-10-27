import { err, ok, type DomainResult } from "../contracts";

// Pure stay pricing for previews/tests. The DB function stay.price_nights/quote_stay is the authority;
// tests/integration/stay-pricing-parity.test.ts keeps both in step.

export type RatePlan =
  | { kind: "base"; price: bigint; extraAdultFee: bigint; extraChildFee: bigint }
  | { kind: "weekday"; dow: number; price: bigint } // 0 = Sunday
  | { kind: "season" | "date"; from: string; to: string; price: bigint }; // [from, to)

const PRIORITY = { date: 3, season: 2, weekday: 1, base: 0 } as const;

export type QuoteInput = {
  arrival: string;
  departure: string;
  adults: number;
  childrenAges: number[];
  room: { capacityAdults: number; maxGuests: number };
  rates: RatePlan[];
  policy: { depositRateBp: number; childFreeUnderAge: number };
  services: { title: string; unitPrice: bigint; qty: number; prebookDiscountBp: number }[];
};

export type QuoteLine = { title: string; amount: bigint; kind: "room_night" | "extra_guest" | "service" | "discount"; night?: string };
export type QuoteResult = { lines: QuoteLine[]; subtotal: bigint; discount: bigint; total: bigint; depositDue: bigint; nights: number };

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);

export function nightsBetween(arrival: string, departure: string): string[] {
  const out: string[] = [];
  for (let t = parse(arrival); t < parse(departure); t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function priceNight(night: string, rates: RatePlan[]): { price: bigint; kind: RatePlan["kind"] } | null {
  const dow = new Date(parse(night)).getUTCDay();
  const applicable = rates.filter((r) =>
    r.kind === "base" ? true : r.kind === "weekday" ? r.dow === dow : r.from <= night && night < r.to,
  );
  const best = applicable.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind])[0];
  return best ? { price: best.price, kind: best.kind } : null;
}

/** ceil(total * bp / 10000), integer VND. */
export const depositFor = (total: bigint, rateBp: number): bigint => (total * BigInt(rateBp) + 9999n) / 10000n;

export function quoteStay(q: QuoteInput): DomainResult<QuoteResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(q.departure) || q.departure <= q.arrival) {
    return err("VALIDATION", "Ngày trả phòng phải sau ngày nhận phòng", "departure");
  }
  if (q.adults < 1 || q.adults + q.childrenAges.length > q.room.maxGuests) {
    return err("VALIDATION", `Phòng tối đa ${q.room.maxGuests} khách`, "guests");
  }
  const base = q.rates.find((r) => r.kind === "base");
  if (!base || base.kind !== "base") return err("VALIDATION", "Phòng chưa có giá", "room");

  const extraAdults = BigInt(Math.max(0, q.adults - q.room.capacityAdults));
  const paidChildren = BigInt(q.childrenAges.filter((a) => a >= q.policy.childFreeUnderAge).length);
  const extraPerNight = extraAdults * base.extraAdultFee + paidChildren * base.extraChildFee;

  const lines: QuoteLine[] = [];
  for (const night of nightsBetween(q.arrival, q.departure)) {
    lines.push({ title: `Tiền phòng đêm ${night}`, amount: priceNight(night, q.rates)!.price, kind: "room_night", night });
    if (extraPerNight > 0n) lines.push({ title: `Phụ thu khách thêm đêm ${night}`, amount: extraPerNight, kind: "extra_guest", night });
  }
  let discount = 0n;
  for (const s of q.services) {
    const amount = s.unitPrice * BigInt(s.qty);
    lines.push({ title: `${s.title} x${s.qty}`, amount, kind: "service" });
    discount += (amount * BigInt(s.prebookDiscountBp)) / 10000n;
  }
  const subtotal = lines.reduce((a, l) => a + l.amount, 0n);
  if (discount > 0n) lines.push({ title: "Ưu đãi đặt trước dịch vụ", amount: -discount, kind: "discount" });
  const total = subtotal - discount;
  return ok({ lines, subtotal, discount, total, depositDue: depositFor(total, q.policy.depositRateBp), nights: lines.filter((l) => l.kind === "room_night").length });
}
