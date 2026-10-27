import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ZSOPO Space: lưu trú năng lượng",
  description: "Không gian lưu trú và trải nghiệm năng lượng của ZSOPO. Điểm đang mở: Zen Homestay Đà Lạt.",
  alternates: { canonical: "/stay" },
};

export default function SpacePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold tracking-wide text-[var(--wood)] uppercase">ZSOPO Space</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Không gian lưu trú năng lượng</h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--ink-2)]">Mỗi điểm Space là nơi nghỉ ngơi có bảng năng lượng cho từng phòng, nghi thức thiền buổi sáng và đội ngũ vận hành theo quy trình chăm sóc chuẩn.</p>
      <h2 className="mt-10 text-xl font-semibold">Điểm đang mở</h2>
      <Link href="/stay/da-lat" className="mt-4 grid overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] hover:shadow-[var(--shadow-2)] md:grid-cols-2">
        <Image src="/assets/zen-homestay-front.jpg" alt="Mặt tiền Zen Homestay Đà Lạt" width={2048} height={1364} sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full object-cover" />
        <div className="p-6">
          <p className="text-xs tracking-wide text-[var(--wood)] uppercase">Homestay · Đà Lạt</p>
          <p className="font-display mt-1 text-2xl font-semibold">Zen Homestay Đà Lạt</p>
          <p className="mt-2 text-[var(--ink-2)]">Nhà gỗ giữa đồi thông, 13 phòng mang tên đá năng lượng. Hiện nhận đặt trực tuyến cho các phòng đã mở bán.</p>
          <span className="mt-4 inline-block underline">Xem điểm và phòng</span>
        </div>
      </Link>
    </div>
  );
}
