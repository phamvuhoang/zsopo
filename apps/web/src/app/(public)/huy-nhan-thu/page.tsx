import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Hủy nhận thư", robots: { index: false } };

async function Result({ searchParams }: Pick<PageProps<"/huy-nhan-thu">, "searchParams">) {
  const { error } = await createPublicClient().schema("crm").rpc("unsubscribe", { p_token: String((await searchParams).t ?? "") });
  return <p className="mt-4">{error ? "Liên kết không hợp lệ hoặc đã hết hạn." : "Bạn sẽ không nhận thư tiếp thị từ ZSOPO nữa. Thư giao dịch (xác nhận đặt phòng, đơn hàng) vẫn được gửi."}</p>;
}

export default function Unsub(props: PageProps<"/huy-nhan-thu">) {
  return <div className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-semibold">Hủy nhận thư tiếp thị</h1><Suspense fallback={<p className="mt-4">Đang xử lý...</p>}><Result searchParams={props.searchParams} /></Suspense></div>;
}
