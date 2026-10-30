import Link from "next/link";

export const metadata = { title: "Không mở được đơn", robots: { index: false } };

export default function OrderLinkInvalid() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Không mở được đơn</h1>
      <p className="mt-4">Liên kết đã hết hạn hoặc không hợp lệ. Vì lý do bảo mật, mã đơn và số điện thoại không đủ để xem đơn. Vui lòng liên hệ ZSOPO để được hỗ trợ xác minh.</p>
      <Link href="/lien-he" className="mt-8 inline-block underline">Liên hệ hỗ trợ</Link>
    </main>
  );
}
