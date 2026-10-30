import { vietQrPayload } from "@zsopo/core";
import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import QRCode from "qrcode";
import { AutoRefresh, ReportTransferButton } from "@/features/stay/components/payment-live";
import { loadReceipt } from "@/lib/receipt";

export const metadata = { title: "Đơn hàng của bạn" };
export const instant = false;

const STEP: Record<string, string> = { new: "Đã đặt", confirmed: "Đã xác nhận", packing: "Đang đóng gói", ritual_hold: "Đang làm nghi lễ chuẩn bị", ready_to_ship: "Sẵn sàng giao", shipped: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy", returned: "Đã trả hàng" };
const PAY: Record<string, string> = { unpaid: "Chưa thanh toán", partial: "Thanh toán một phần", paid: "Đã thanh toán", overpaid: "Thanh toán thừa, sẽ hoàn", refunded: "Đã hoàn tiền" };

export default async function OrderPage({ params }: PageProps<"/don-hang/[code]">) {
  const { code } = await params;
  const r = await loadReceipt(code);
  if (!r || !r.shop) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold">Không mở được đơn</h1>
        <p className="mt-4">Trình duyệt này chưa có phiên xem đơn. Mã đơn và số điện thoại không đủ để xem đơn; vui lòng liên hệ hỗ trợ để xác minh.</p>
      </div>
    );
  }
  const s = r.shop;
  const qr = r.vietqr && s.method === "bank" && r.paymentStatus === "unpaid" && r.status === "pending"
    ? await QRCode.toString(vietQrPayload({ bankBin: r.vietqr.bankBin, accountNo: r.vietqr.accountNo, amount: r.vietqr.amount, reference: r.vietqr.reference }), { type: "svg", margin: 1, width: 220 }) : null;
  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <AutoRefresh />
      <div>
        <h1 className="text-3xl font-semibold">Đơn hàng {r.orderCode}</h1>
        <p className="mt-2 flex flex-wrap gap-2"><StatusBadge tone="info">{STEP[s.fulfillment]}</StatusBadge><StatusBadge tone={r.paymentStatus === "paid" ? "success" : "warning"}>{PAY[r.paymentStatus]}</StatusBadge><StatusBadge>{s.method === "cod" ? "COD" : "Chuyển khoản"}</StatusBadge></p>
        {r.status === "expired" && <p role="status" className="mt-3 text-[var(--danger)]">Đơn đã hủy do quá hạn chuyển khoản. Nếu bạn đã chuyển, ZSOPO sẽ liên hệ để giao hoặc hoàn tiền.</p>}
        {qr && r.vietqr && (
          <div className="mt-4 grid gap-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[auto_1fr]">
            <div role="img" aria-label="Mã VietQR chuyển khoản đơn hàng" className="w-56 bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
              <dt>Ngân hàng</dt><dd>{r.vietqr.bankName}</dd><dt>Số TK</dt><dd className="font-mono">{r.vietqr.accountNo}</dd>
              <dt>Số tiền</dt><dd><Price value={r.vietqr.amount} /></dd><dt>Nội dung</dt><dd className="font-mono">{r.vietqr.reference}</dd>
            </dl>
          </div>
        )}
        {qr && (r.transferReportedAt ? <p role="status" className="mt-2 text-sm">Đã báo chuyển khoản, ZSOPO đang kiểm tra.</p> : <div className="mt-2"><ReportTransferButton code={r.orderCode} /></div>)}
        {s.ritualRequired && <p className="mt-4 text-sm">Sản phẩm có nghi lễ chuẩn bị năng lượng 24 giờ trước khi giao{s.ritualReadyAt ? `, dự kiến xong lúc ${new Date(s.ritualReadyAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}.</p>}
        {s.tracking && <p className="mt-2 text-sm">Mã vận đơn: <span className="font-mono">{s.tracking}</span></p>}
        <h2 className="mt-6 font-semibold">Tiến trình</h2>
        <ol className="mt-2 text-sm">{s.events.map((e, i) => <li key={i}>{new Date(e.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {STEP[e.to]}</li>)}</ol>
        {s.rituals.length > 0 && <p className="mt-4 text-sm">Hướng dẫn nghi lễ: {s.rituals.map((slug) => <Link key={slug} href={`/la/${slug}`} className="mr-2 underline">mở hướng dẫn</Link>)}</p>}
      </div>
      <aside className="h-fit rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
        <ul className="text-sm">{r.lines.map((l, i) => <li key={i} className={`flex justify-between gap-2 ${l.cancelled ? "line-through opacity-60" : ""}`}><span>{l.title}{l.cancelled && " (đã hủy)"}</span><Price value={l.amount} /></li>)}</ul>
        <p className="mt-2 flex justify-between border-t border-[var(--line)] pt-2 font-semibold"><span>Tổng</span><Price value={r.total} /></p>
      </aside>
    </div>
  );
}
