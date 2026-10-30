import type { DomainResult } from "@zsopo/core";
import { call, type Db } from "./rpc";

export type ManualBookingInput = {
  roomId: string; arrival: string; departure: string; adults: number; childrenAges: number[];
  guest: { name: string; phone: string; email?: string }; source: "zalo" | "phone" | "walk_in" | "ota" | "b2b";
  collectedBy: "zsopo" | "ota"; notes?: string; idempotencyKey: string;
};

/** LT01: staff booking through the same quote + allocation path as the web (no bypass of anti double-booking). */
export const createManualBooking = (client: Db, i: ManualBookingInput): Promise<DomainResult<{ bookingId: string; orderId: string; orderCode: string }>> =>
  call(client, "stay", "create_manual_booking", {
    p_room: i.roomId, p_arrival: i.arrival, p_departure: i.departure, p_adults: i.adults, p_children: i.childrenAges, p_guest: i.guest,
    p_source: i.source, p_collected_by: i.collectedBy, p_notes: i.notes ?? null, p_idempotency: i.idempotencyKey,
  });

export type TransitionInput = {
  bookingId: string; expectedVersion: number; action: "check_in" | "check_out" | "cancel" | "no_show";
  reason?: string; idempotencyKey: string; identityVerified?: boolean; guestAcknowledged?: boolean; keyHandover?: string; lateCheckoutUntil?: string;
};

export const transitionBooking = (client: Db, i: TransitionInput): Promise<DomainResult<{ state: string; version: number; stayToken?: string }>> =>
  call(client, "stay", "transition_booking", {
    p_booking: i.bookingId, p_expected_version: i.expectedVersion, p_action: i.action, p_reason: i.reason ?? null, p_idempotency: i.idempotencyKey,
    p_opts: { identityVerified: i.identityVerified ?? false, guestAcknowledged: i.guestAcknowledged ?? false, keyHandover: i.keyHandover ?? null, lateCheckoutUntil: i.lateCheckoutUntil ?? null },
  });
