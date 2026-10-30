import { redirect } from "next/navigation";
import { loadReceipt } from "@/lib/receipt";
import { OrderNotOpen } from "./not-open";

export const metadata = { title: "Đặt phòng của bạn" };
export const instant = false;

export default async function BookingOverview({ params }: PageProps<"/dat-phong/[code]">) {
  const { code } = await params;
  const r = await loadReceipt(code);
  if (!r?.booking) return <OrderNotOpen />;
  redirect(["confirmed", "checked_in", "checked_out"].includes(r.booking.state) ? `/dat-phong/${code}/xac-nhan` : `/dat-phong/${code}/thanh-toan`);
}
