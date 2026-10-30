import Link from "next/link";

export function OrderNotOpen() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-semibold">Không mở được đơn</h1>
      <p className="mt-4">Trình duyệt này chưa có phiên xem đơn. Hãy mở liên kết trong email xác nhận. Mã đơn hoặc số điện thoại không đủ để xem đơn.</p>
      <Link href="/lien-he" className="mt-6 inline-block underline">Cần hỗ trợ</Link>
    </div>
  );
}
