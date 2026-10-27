import Link from "next/link";

export const metadata = { title: "Không có quyền", robots: { index: false } };

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Không có quyền truy cập</h1>
      <p className="mt-4">Tài khoản của bạn không được giao quyền cho trang này hoặc điểm này. Liên hệ quản lý điểm nếu cần cấp quyền.</p>
      <Link href="/" className="mt-8 inline-block underline">
        Về trang chủ
      </Link>
    </main>
  );
}
