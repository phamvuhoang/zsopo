import type { DomainResult, ShopSelection } from "@zsopo/core";
import { call, type Db } from "./rpc";

export type ShopOrderResult = { orderId: string; orderCode: string; total: string; receiptPath: string; guestToken?: string };

/** Server reprices every line; the client only sends variant ids and quantities. */
export const createShopOrder = (client: Db, i: ShopSelection & { idempotencyKey: string; terms: boolean; marketing?: boolean; notes?: string }): Promise<DomainResult<ShopOrderResult>> =>
  call(client, "shop", "create_shop_order", {
    p_lines: i.lines, p_address: i.shippingAddress, p_method: i.method, p_email: i.email ?? null, p_idempotency: i.idempotencyKey,
    p_consents: { terms: i.terms, marketing: i.marketing ?? false }, p_notes: i.notes ?? null,
  });

export type PricedLine = { variantId: string; qty: number; maxQty: number; name: string; price: string; amount: string; inStock: boolean };
export const priceCart = (client: Db, lines: { variantId: string; qty: number }[], regionCode: string | null) =>
  call<{ lines: PricedLine[]; subtotal: string; shipping: string; total: string }>(client, "shop", "price_cart", { p_lines: lines, p_region: regionCode });

export const transitionFulfillment = (client: Db, i: { orderId: string; to: string; expectedVersion: number; note?: string; tracking?: string }) =>
  call<{ fulfillment: string; version: number }>(client, "shop", "transition_fulfillment", { p_order: i.orderId, p_to: i.to, p_expected_version: i.expectedVersion, p_note: i.note ?? null, p_tracking: i.tracking ?? null });
