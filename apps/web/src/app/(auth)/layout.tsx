import { Suspense } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-12">
      <Suspense fallback={<p>Đang tải...</p>}>{children}</Suspense>
    </main>
  );
}

export const metadata = { robots: { index: false, follow: false } };
