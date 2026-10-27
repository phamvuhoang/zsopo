import { StaySelectionSchema, err, type DomainResult, type GuestInput, type Hold, type Quote, type StaySelection } from "@zsopo/core";
import { call, type Db } from "./rpc";

export async function quoteStay(client: Db, input: StaySelection): Promise<DomainResult<Quote>> {
  const parsed = StaySelectionSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]!.message, String(parsed.error.issues[0]!.path[0] ?? ""));
  const s = parsed.data;
  return call<Quote>(client, "stay", "quote_stay", {
    p_room: s.roomId,
    p_arrival: s.arrival,
    p_departure: s.departure,
    p_adults: s.adults,
    p_children: s.childrenAges,
    p_services: s.services,
  });
}

export type HoldInput = {
  quoteId: string;
  guest: GuestInput;
  policyVersion: string;
  idempotencyKey: string;
  consents: { terms: boolean; marketing: boolean };
  arrivalTime?: string;
  notes?: string;
};

export type HoldResult = Hold & { orderCode: string; guestToken?: string };

export function createStayHold(client: Db, input: HoldInput): Promise<DomainResult<HoldResult>> {
  return call<HoldResult>(client, "stay", "create_stay_hold", {
    p_quote: input.quoteId,
    p_guest: input.guest,
    p_policy_version: input.policyVersion,
    p_idempotency: input.idempotencyKey,
    p_consents: input.consents,
    p_arrival_time: input.arrivalTime ?? null,
    p_notes: input.notes ?? null,
  });
}

export type CalendarDay = { date: string; available: boolean; price: string | null };

export const roomCalendar = (client: Db, roomId: string, from: string, to: string) =>
  call<CalendarDay[]>(client, "stay", "room_calendar", { p_room: roomId, p_from: from, p_to: to });
