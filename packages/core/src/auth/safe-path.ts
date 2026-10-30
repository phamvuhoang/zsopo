/** Allow only same-origin relative paths for post-login redirects. */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const u = new URL(next, "http://x.invalid");
    return u.host === "x.invalid" ? u.pathname + u.search : fallback;
  } catch {
    return fallback;
  }
}
