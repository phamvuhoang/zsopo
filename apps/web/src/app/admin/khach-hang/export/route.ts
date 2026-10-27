import { toCsv } from "@zsopo/core";
import { NextResponse, type NextRequest } from "next/server";
import { filterFromParams } from "@/features/crm/segments";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

// CSV export (crm.export needs MFA and is audited in the DB). Formula injection is neutralised by toCsv.
export async function GET(request: NextRequest) {
  const ctx = await getStaffContext("/admin/khach-hang");
  const filter = filterFromParams(Object.fromEntries(request.nextUrl.searchParams));
  const { data, error } = await (await createClient()).schema("crm").rpc("export_segment", { p_entity: ctx.location.entity_id, p_filter: filter });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message === "FORBIDDEN" ? 403 : 400 });
  const rows = (data ?? []) as { display_name: string; email: string | null; phone: string | null; source: string; marketing: boolean }[];
  const csv = toCsv([["Họ tên", "Email", "Điện thoại", "Nguồn", "Đồng ý marketing"], ...rows.map((r) => [r.display_name, r.email, r.phone, r.source, r.marketing ? "có" : "không"])]);
  return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="khach-hang.csv"', "Cache-Control": "no-store" } });
}
