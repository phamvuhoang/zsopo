import { Suspense } from "react";

export const metadata = { title: { default: "Vận hành", template: "%s | ZSOPO Ops" }, robots: { index: false, follow: false } };

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[var(--bg)]">
      <Suspense fallback={<p className="p-4">Đang tải...</p>}>{children}</Suspense>
    </div>
  );
}
