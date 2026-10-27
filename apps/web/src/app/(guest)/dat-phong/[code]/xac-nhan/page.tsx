import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadReceipt } from "@/lib/receipt";
import { OrderNotOpen } from "../not-open";

export const metadata = { title: "Xác nhận đặt phòng" };
export const instant = false;

const CHANNEL = { email: "Email", zalo: "Zalo" } as const;
const STATUS = { sent: "đã gửi", failed: "gửi lỗi, đang thử lại", disabled: "chưa bật", skipped: "bỏ qua" } as const;

export default async function ConfirmationPage({ params }: PageProps<"/dat-phong/[code]/xac-nhan">) {
  const { code } = await params;
  const r = await loadReceipt(code);
  if (!r || !r.booking) return <OrderNotOpen />;
  const b = r.booking;
  if (!["confirmed", "checked_in", "checked_out"].includes(b.state)) redirect(`/dat-phong/${code}/thanh-toan`);
  return (
    <div className="mx-auto max-w-2xl">
      <StatusBadge tone="success">Đã xác nhận</StatusBadge>
      <h1 className="mt-2 text-3xl font-semibold">Đặt phòng đã được xác nhận</h1>
      <p className="mt-2">Cảm ơn {r.guestName}. Mã đặt phòng <span className="font-mono font-semibold">{r.orderCode}</span>.</p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 text-sm">
        <dt className="text-[var(--ink-3)]">Phòng</dt><dd>Phòng {b.roomName}</dd>
        <dt className="text-[var(--ink-3)]">Nhận phòng</dt><dd>{b.arrival} từ {b.checkIn}</dd>
        <dt className="text-[var(--ink-3)]">Trả phòng</dt><dd>{b.departure} trước {b.checkOut}</dd>
        <dt className="text-[var(--ink-3)]">Đã thanh toán</dt><dd><Price value={r.paid} /></dd>
        <dt className="text-[var(--ink-3)]">Còn lại tại quầy</dt><dd><Price value={r.due} /></dd>
      </dl>
      <section className="mt-6" aria-labelledby="thong-bao">
        <h2 id="thong-bao" className="text-lg font-semibold">Thông báo xác nhận</h2>
        {r.notifications.length === 0 ? (
          <p className="text-sm text-[var(--ink-2)]">{r.confirmationQueued ? "Email xác nhận đang được gửi." : "Chưa có thông báo nào được gửi."}</p>
        ) : (
          <ul className="text-sm">
            {r.notifications.map((n, i) => (
              <li key={i}>{CHANNEL[n.channel as keyof typeof CHANNEL] ?? n.channel}: {STATUS[n.status as keyof typeof STATUS] ?? n.status}</li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-6 text-sm">
        Cẩm nang, đường đi và nội quy: <Link href="/handbook/da-lat" className="underline">Cẩm nang Zen Homestay Đà Lạt</Link>. Muốn đổi ngày hoặc hủy, vui lòng <Link href="/lien-he" className="underline">liên hệ lễ tân</Link>; mọi thay đổi theo chính sách tại thời điểm đặt.
      </p>
    </div>
  );
}
