import type { DomainResult } from "@zsopo/core";
import { call, type Db } from "./rpc";

export type ServiceRequestInput = { token: string; serviceId: string; qty: number; scheduledAt: string; idempotencyKey: string; notes?: string };

/** Guest in-stay request: needs the stay capability handed over at check-in (room number is not a credential). */
export const requestService = (client: Db, i: ServiceRequestInput): Promise<DomainResult<{ requestId: string; orderItemId: string }>> =>
  call(client, "stay", "request_stay_service", {
    p_token: i.token, p_service: i.serviceId, p_qty: i.qty, p_scheduled_at: i.scheduledAt, p_idempotency: i.idempotencyKey, p_notes: i.notes ?? null,
  });

export const cancelMyService = (client: Db, token: string, requestId: string): Promise<DomainResult<null>> =>
  call(client, "stay", "cancel_my_service", { p_token: token, p_request: requestId });

export type ServiceState = "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

export const transitionServiceRequest = (
  client: Db,
  i: { requestId: string; to: ServiceState; expectedVersion: number; note?: string },
): Promise<DomainResult<{ state: ServiceState; version: number }>> =>
  call(client, "stay", "transition_service_request", { p_request: i.requestId, p_to: i.to, p_expected_version: i.expectedVersion, p_note: i.note ?? null });

export const myStayServices = (client: Db, token: string) =>
  call<{ booking: { roomName: string; departure: string }; requests: { id: string; name: string; qty: number; state: ServiceState; scheduledAt: string; amount: string }[] }>(
    client, "stay", "my_stay_services", { p_token: token });
