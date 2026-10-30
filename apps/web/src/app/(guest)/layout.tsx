import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { robots: { index: false, follow: false } };

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="noi-dung" className="mx-auto max-w-6xl px-4 py-10">
        <Suspense fallback={<p>Đang tải...</p>}>{children}</Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
