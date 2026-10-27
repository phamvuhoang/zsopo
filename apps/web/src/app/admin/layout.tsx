import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: { default: "Quản trị", template: "%s | ZSOPO Admin" }, robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Tổng quan"],
  ["/admin/diem/da-lat", "Điểm Đà Lạt"],
  ["/admin/thanh-toan", "Thanh toán"],
  ["/admin/nhan-su", "Nhân sự"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh md:grid md:grid-cols-[220px_1fr]">
      <nav aria-label="Quản trị" className="border-b border-[var(--line)] bg-[var(--surface)] p-4 md:border-r md:border-b-0">
        <p className="font-display text-lg font-semibold">ZSOPO Admin</p>
        <ul className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
          {NAV.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="block min-h-11 rounded-md px-3 py-2 whitespace-nowrap hover:bg-[var(--surface-2)]">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="p-4 md:p-8">
        <Suspense fallback={<p>Đang tải...</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
