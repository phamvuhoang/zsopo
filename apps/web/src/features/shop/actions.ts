"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";
import { createPublicClient, visitorIp } from "@/lib/supabase/server";

export async function notifyBackInStock(_: ActionState, f: FormData): Promise<ActionState> {
  const { error } = await createPublicClient(await visitorIp()).schema("shop").rpc("request_back_in_stock", {
    p_variant: str(f, "variantId")!, p_email: str(f, "email") ?? "", p_consent: f.get("consent") === "on",
  });
  return error ? { error: error.details || "Không đăng ký được." } : { status: "Đã đăng ký. Chúng tôi sẽ email khi có hàng." };
}

export async function createProduct(_: ActionState, f: FormData): Promise<ActionState> {
  const name = str(f, "name") ?? "";
  const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const list = (k: string) => (str(f, k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const r = await rpcAction("shop", "create_product", { p: {
    entityId: str(f, "entityId"), categoryId: str(f, "categoryId"), name, slug, sku: str(f, "sku"), variantName: str(f, "variantName"), price: int(f, "price"),
    purpose: str(f, "purpose"), origin: str(f, "origin"), usage: str(f, "usage"), frequency: str(f, "frequency"), stones: list("stones"), chakras: f.getAll("chakras").map(String), videoUrl: str(f, "videoUrl"),
  } }, "Đã tạo sản phẩm nháp. Kiểm tra bảng năng lượng rồi mở bán.");
  revalidatePath("/admin/san-pham");
  return r;
}

export async function publishProduct(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("shop", "publish_product", { p_product: str(f, "productId") }, "Đã mở bán.", ["shop"]);
  revalidatePath("/admin/san-pham");
  return r;
}

export async function receiveStock(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("shop", "receive_stock", { p_variant: str(f, "variantId"), p_warehouse: str(f, "warehouseId"), p_qty: Number(str(f, "qty") ?? 0), p_note: str(f, "note") }, "Đã cập nhật tồn kho.");
  updateTag("shop");
  revalidatePath("/admin/kho");
  return r;
}
