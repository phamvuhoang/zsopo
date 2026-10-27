/** Shipping fee for goods value after discount (before shipping). freeThreshold null = never free. */
export function shippingFee(goodsAfterDiscount: bigint, rule: { fee: bigint; freeThreshold: bigint | null }): bigint {
  return rule.freeThreshold !== null && goodsAfterDiscount >= rule.freeThreshold ? 0n : rule.fee;
}
