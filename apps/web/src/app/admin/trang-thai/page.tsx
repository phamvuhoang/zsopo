import { HealthPanel } from "@/features/ops/health";
import { getStaffContext } from "@/lib/auth/context";

export const instant = false;
export const metadata = { title: "Trạng thái hệ thống" };

export default async function AdminStatus() {
  const ctx = await getStaffContext("/admin/trang-thai");
  return <><h1 className="text-2xl font-semibold">Trạng thái hệ thống</h1><HealthPanel entityId={ctx.location.entity_id} /></>;
}
