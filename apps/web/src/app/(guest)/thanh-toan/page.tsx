import { CheckoutForm } from "@/features/shop/components/checkout-form";
import { createClient, createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Thanh toán đơn hàng" };
export const instant = false;

export default async function CheckoutPage() {
  const [{ data: claims }, { data: regions }] = await Promise.all([
    (await createClient()).auth.getClaims(),
    createPublicClient().schema("shop").from("regions").select("code, name").eq("active", true).order("sort"),
  ]);
  return (
    <>
      <h1 className="text-3xl font-semibold">Thanh toán</h1>
      <div className="mt-6"><CheckoutForm regions={regions ?? []} signedIn={!!claims?.claims} /></div>
    </>
  );
}
