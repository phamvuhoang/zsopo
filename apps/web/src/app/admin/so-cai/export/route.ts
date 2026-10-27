import { toCsv } from "@zsopo/core";
import { NextResponse, type NextRequest } from "next/server";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ctx = await getStaffContext("/admin/so-cai");
  const db = await createClient();
  const { data: allowed } = await db.schema("core").rpc("has_permission", { p_action: "ledger.export", p_entity: ctx.location.entity_id });
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  let q = db.schema("commerce").from("ledger_entries").select("event_id, account, amount, source, recognition_date, created_at").eq("entity_id", ctx.location.entity_id).order("id").limit(100000);
  const tk = request.nextUrl.searchParams.get("tk");
  if (tk) q = q.eq("account", tk);
  const { data } = await q;
  const csv = toCsv([["Ngày ghi nhận", "Sự kiện", "Tài khoản", "Số tiền", "Nguồn", "Tạo lúc"], ...(data ?? []).map((e) => [e.recognition_date, e.event_id, e.account, String(e.amount), e.source, e.created_at])]);
  return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="so-cai.csv"', "Cache-Control": "no-store" } });
}
