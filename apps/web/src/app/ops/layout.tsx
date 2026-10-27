import Link from "next/link";
import { Suspense } from "react";

const NAV = [
  ["/ops", "Trang chính"],
  ["/ops/ca", "Ca"],
  ["/ops/phong", "Sơ đồ phòng"],
  ["/ops/dat-phong", "Đặt phòng"],
  ["/ops/dich-vu", "Dịch vụ"],
  ["/ops/tickets", "Sự cố"],
] as const;

export const metadata = { title: { default: "Vận hành", template: "%s | ZSOPO Ops" }, robots: { index: false, follow: false } };

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
      <Suspense fallback={<p className="p-4">Đang tải...</p>}>{children}</Suspense>
    </div>
  );
}
