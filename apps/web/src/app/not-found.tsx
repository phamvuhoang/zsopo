import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-4">Đường dẫn có thể đã thay đổi hoặc nội dung chưa được mở.</p>
      <Link className="mt-8 inline-block underline" href="/">
        Về trang chủ
      </Link>
    </main>
  );
}
