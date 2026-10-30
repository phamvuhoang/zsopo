import { CartView } from "@/features/shop/components/cart-view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Giỏ hàng" };
export const instant = false;

export default async function CartPage() {
  const { data } = await (await createClient()).auth.getClaims();
  return (
    <>
      <h1 className="text-3xl font-semibold">Giỏ hàng</h1>
      <div className="mt-6"><CartView signedIn={!!data?.claims} /></div>
    </>
  );
}
