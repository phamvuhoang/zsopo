import Link from "next/link";
import { Suspense } from "react";
import { SyncStatus } from "@/features/ops/sync-status";
import { getStaffContext } from "@/lib/auth/context";

const NAV = [
  ["/ops", "Trang chính"],
  ["/ops/ca", "Ca"],
  ["/ops/phong", "Sơ đồ phòng"],
  ["/ops/dat-phong", "Đặt phòng"],
  ["/ops/dich-vu", "Dịch vụ"],
  ["/ops/tickets", "Sự cố"],
  ["/ops/buong-phong", "Buồng phòng"],
  ["/ops/lich-don", "Lịch dọn"],
  ["/ops/vat-tu", "Vật tư"],
  ["/ops/do-that-lac", "Đồ thất lạc"],
  ["/ops/huong-dan", "Hướng dẫn"],
] as const;

export const metadata = { title: { default: "Vận hành", template: "%s | ZSOPO Ops" }, robots: { index: false, follow: false }, manifest: "/ops.webmanifest" };

async function OpsSync() {
  const ctx = await getStaffContext("/ops");
  return <SyncStatus userId={ctx.actor.userId} locationId={ctx.location.id} entityId={ctx.location.entity_id} />;
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <nav aria-label="Vận hành" className="sticky top-0 z-[100] overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)]">
        <ul className="mx-auto flex max-w-5xl gap-1 px-2">
          {NAV.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="flex min-h-11 items-center px-3 text-sm whitespace-nowrap">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <Suspense fallback={null}>
        <OpsSync />
      </Suspense>
      <Suspense fallback={<p className="p-4">Đang tải...</p>}>{children}</Suspense>
    </div>
  );
}
