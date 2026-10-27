import { vietQrPayload } from "@zsopo/core";
import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { AutoRefresh, HoldCountdown, ReportTransferButton } from "@/features/stay/components/payment-live";
import { loadReceipt } from "@/lib/receipt";
import { OrderNotOpen } from "../not-open";

export const metadata = { title: "Thanh toán tiền cọc" };
export const instant = false;

export default async function PaymentPage({ params }: PageProps<"/dat-phong/[code]/thanh-toan">) {
  const { code } = await params;
  const r = await loadReceipt(code);
  if (!r || !r.booking) return <OrderNotOpen />;
  const b = r.booking;
  if (b.state === "confirmed" || b.state === "checked_in" || b.state === "checked_out") redirect(`/dat-phong/${code}/xac-nhan`);
  const qr = r.vietqr ? await QRCode.toString(vietQrPayload({ bankBin: r.vietqr.bankBin, accountNo: r.vietqr.accountNo, amount: r.vietqr.amount, reference: r.vietqr.reference }), { type: "svg", margin: 1, width: 240 }) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <AutoRefresh />
      <div>
        <h1 className="text-3xl font-semibold">Thanh toán tiền cọc</h1>
        <p className="mt-1 text-sm text-[var(--ink-3)]">Mã đặt phòng <span className="font-mono">{r.orderCode}</span></p>
        {b.state === "held" && (
          <div className="mt-6 flex flex-col gap-4">
            <StatusBadge tone="warning">Chờ xác nhận tiền cọc</StatusBadge>
            {b.heldUntil && <HoldCountdown heldUntil={b.heldUntil} serverNow={r.serverNow} />}
            {r.vietqr && qr ? (
              <div className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-[auto_1fr]">
                <div role="img" aria-label="Mã VietQR chuyển khoản tiền cọc" className="w-60 bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-[var(--ink-3)]">Ngân hàng</dt><dd>{r.vietqr.bankName}</dd>
                  <dt className="text-[var(--ink-3)]">Số tài khoản</dt><dd className="font-mono">{r.vietqr.accountNo}</dd>
                  <dt className="text-[var(--ink-3)]">Chủ tài khoản</dt><dd>{r.vietqr.accountName}</dd>
                  <dt className="text-[var(--ink-3)]">Số tiền</dt><dd className="font-semibold"><Price value={r.vietqr.amount} /></dd>
                  <dt className="text-[var(--ink-3)]">Nội dung</dt><dd className="font-mono font-semibold">{r.vietqr.reference}</dd>
                </dl>
              </div>
            ) : (
              <p className="rounded-md bg-[var(--warning-soft)] p-3 text-sm">Tài khoản nhận chuyển khoản chưa được cấu hình. Vui lòng liên hệ lễ tân để thanh toán.</p>
            )}
            <p className="text-sm text-[var(--ink-2)]">Mã QR chỉ hướng dẫn chuyển khoản. Đặt phòng được xác nhận khi ZSOPO đối chiếu tiền đã về tài khoản, thường trong giờ làm việc.</p>
            {r.transferReportedAt ? (
              <p role="status" className="text-sm text-[var(--info)]">Đã báo chuyển khoản lúc {new Date(r.transferReportedAt).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. ZSOPO đang kiểm tra giao dịch.</p>
            ) : (
              <ReportTransferButton code={r.orderCode} />
            )}
          </div>
        )}
        {b.state === "needs_review" && (
          <div className="mt-6" role="status">
            <StatusBadge tone="info">Đang đối soát</StatusBadge>
            <p className="mt-3">ZSOPO đã nhận <Price value={r.paid} /> và đang đối soát với tiền cọc <Price value={r.depositDue} />. Lễ tân sẽ liên hệ bạn để hoàn tất. Phòng của bạn vẫn được giữ trong lúc đối soát.</p>
          </div>
        )}
        {(b.state === "expired" || b.state === "cancelled") && (
          <div className="mt-6" role="status">
            <StatusBadge tone="danger">{b.state === "expired" ? "Hết thời gian giữ phòng" : "Đặt phòng đã hủy"}</StatusBadge>
            <p className="mt-3">Nếu bạn đã chuyển khoản, đừng lo: khoản tiền được ghi nhận và ZSOPO sẽ liên hệ để xếp lại phòng hoặc hoàn tiền. Bạn có thể <Link href="/stay/da-lat/phong" className="underline">đặt lại phòng khác</Link>.</p>
          </div>
        )}
      </div>
      <Summary r={r} />
    </div>
  );
}

function Summary({ r }: { r: NonNullable<Awaited<ReturnType<typeof loadReceipt>>> }) {
  const b = r.booking!;
  return (
    <aside className="h-fit rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-semibold">Phòng {b.roomName}</h2>
      <p className="text-sm text-[var(--ink-2)]">{b.arrival} đến {b.departure} · {b.adults} người lớn{b.children ? `, ${b.children} trẻ em` : ""}</p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {r.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-2"><span>{l.title}</span><Price value={l.amount} /></li>
        ))}
      </ul>
      <dl className="mt-3 border-t border-[var(--line)] pt-3 text-sm">
        <div className="flex justify-between font-semibold"><dt>Tổng</dt><dd><Price value={r.total} /></dd></div>
        <div className="flex justify-between"><dt>Tiền cọc</dt><dd><Price value={r.depositDue} /></dd></div>
        <div className="flex justify-between"><dt>Đã thanh toán</dt><dd><Price value={r.paid} /></dd></div>
      </dl>
      {r.policySummary && <p className="mt-3 text-xs text-[var(--ink-2)]">{r.policySummary}</p>}
    </aside>
  );
}
