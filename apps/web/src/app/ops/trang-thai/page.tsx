import { HealthPanel } from "@/features/ops/health";
import { getStaffContext } from "@/lib/auth/context";

export const instant = false;
export const metadata = { title: "Trạng thái hệ thống" };

export default async function OpsStatus() {
  const ctx = await getStaffContext("/ops/trang-thai");
  return <main className="mx-auto max-w-3xl px-4 py-6"><h1 className="text-2xl font-semibold">Trạng thái hệ thống</h1><HealthPanel entityId={ctx.location.entity_id} /></main>;
}
