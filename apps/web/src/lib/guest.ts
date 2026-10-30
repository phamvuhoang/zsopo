import "server-only";
import { cookies } from "next/headers";

// Guest capability cookie per order: HttpOnly, never readable by JS, never in URLs after the exchange.
const name = (code: string) => `zsg_${code.replace(/[^A-Z0-9]/gi, "")}`;

export async function setGuestToken(orderCode: string, token: string) {
  (await cookies()).set(name(orderCode), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 24 * 3600,
  });
}

export async function getGuestToken(orderCode: string): Promise<string | null> {
  return (await cookies()).get(name(orderCode))?.value ?? null;
}
