import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

// Called by the DB scheduler after scheduled posts go live (Vault: revalidate_url, revalidate_secret).
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const { tags } = (await request.json().catch(() => ({ tags: [] }))) as { tags?: string[] };
  for (const t of (tags ?? []).filter((x) => /^[\w:-]{1,64}$/.test(x)).slice(0, 20)) revalidateTag(t, "max");
  return NextResponse.json({ ok: true });
}
