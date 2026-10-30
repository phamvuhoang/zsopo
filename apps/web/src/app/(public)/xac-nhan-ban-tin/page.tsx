import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Xác nhận nhận bản tin", robots: { index: false } };

async function Result({ searchParams }: Pick<PageProps<"/xac-nhan-ban-tin">, "searchParams">) {
  const token = String((await searchParams).t ?? "");
  const { error } = await createPublicClient().schema("content").rpc("confirm_newsletter", { p_token: token });
  return <p className="mt-4">{error ? "Liên kết không hợp lệ hoặc đã hết hạn." : "Đã xác nhận. Bạn sẽ nhận thư năng lượng ZSOPO."}</p>;
}

export default function ConfirmNewsletter(props: PageProps<"/xac-nhan-ban-tin">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Xác nhận nhận bản tin</h1>
      <Suspense fallback={<p className="mt-4">Đang xử lý...</p>}><Result searchParams={props.searchParams} /></Suspense>
    </div>
  );
}
