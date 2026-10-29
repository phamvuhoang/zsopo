// Regression tests for the fourth review (each failed before its fix).
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { USERS, aal2ClientFor, clientFor, db, heldBooking } from "./helpers";

afterAll(() => db.end());

describe("review4 #3 MFA chuyển khoản", () => {
  it("lễ tân chưa MFA không ghi được chuyển khoản; có MFA thì được; tiền mặt không cần MFA", async () => {
    const h = await heldBooking();
    const bank = (c: SupabaseClient) => recordPayment(c, { orderId: h.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "100000",
      receivedAt: new Date().toISOString(), evidenceNote: "Sao kê dòng 1", idempotencyKey: randomUUID() });
    const r1 = await bank(await clientFor(USERS.frontDesk));
    expect(!r1.ok && r1.error.code).toBe("FORBIDDEN");
    expect((await bank(aal2ClientFor(USERS.frontDesk))).ok).toBe(true);
    const cash = await recordPayment(await clientFor(USERS.frontDesk), { orderId: h.orderId, provider: "cash", providerRef: randomUUID(), amount: "50000",
      receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    expect(cash.ok).toBe(true);
  });
});
