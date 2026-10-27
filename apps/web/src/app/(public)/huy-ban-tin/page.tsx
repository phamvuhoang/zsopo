import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Hủy nhận bản tin", robots: { index: false } };

async function Result({ searchParams }: Pick<PageProps<"/huy-ban-tin">, "searchParams">) {
  const token = String((await searchParams).t ?? "");
  const { error } = await createPublicClient().schema("content").rpc("unsubscribe_newsletter", { p_token: token });
  return <p className="mt-4">{error ? "Liên kết không hợp lệ hoặc đã dùng." : "Bạn đã hủy nhận bản tin ZSOPO."}</p>;
}

export default function Unsubscribe(props: PageProps<"/huy-ban-tin">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Hủy nhận bản tin</h1>
      <Suspense fallback={<p className="mt-4">Đang xử lý...</p>}><Result searchParams={props.searchParams} /></Suspense>
    </div>
  );
}
