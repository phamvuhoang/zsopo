import { toCsv } from "@zsopo/core";
import { NextResponse, type NextRequest } from "next/server";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

// CSV export (ledger.export needs MFA; the RPC checks it, caps at 100.000 rows and audits).
export async function GET(request: NextRequest) {
  const ctx = await getStaffContext("/admin/so-cai");
  const { data, error } = await (await createClient()).schema("commerce").rpc("export_ledger", { p_entity: ctx.location.entity_id, p_account: request.nextUrl.searchParams.get("tk") || undefined });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message === "FORBIDDEN" ? 403 : 400 });
  const rows = (data ?? []) as { recognitionDate: string; eventId: string; account: string; amount: string; source: string; createdAt: string }[];
  const csv = toCsv([["Ngày ghi nhận", "Sự kiện", "Tài khoản", "Số tiền", "Nguồn", "Tạo lúc"], ...rows.map((e) => [e.recognitionDate, e.eventId, e.account, e.amount, e.source, e.createdAt])]);
  return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="so-cai.csv"', "Cache-Control": "no-store" } });
}
