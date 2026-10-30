import { afterAll, describe, expect, it } from "vitest";
import { API_URL, E1, L1, PUBLISHABLE_KEY, USERS, clientFor, db } from "./helpers";

afterAll(() => db.end());

const invite = (token?: string) =>
  fetch(`${API_URL}/functions/v1/staff-admin`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action: "invite", email: "moi@example.test", role: "front_desk", entityId: E1, locationId: L1 }),
  });

describe("Edge staff-admin", () => {
  it("từ chối khách chưa đăng nhập", async () => {
    expect((await invite()).status).toBe(401);
  });
  it("lễ tân không mời được nhân sự", async () => {
    const c = await clientFor(USERS.frontDesk);
    const token = (await c.auth.getSession()).data.session!.access_token;
    expect((await invite(token)).status).toBe(403);
  });
  it("quản lý chưa MFA không mời được (cần aal2)", async () => {
    const c = await clientFor(USERS.manager);
    const token = (await c.auth.getSession()).data.session!.access_token;
    expect((await invite(token)).status).toBe(403);
  });
});
