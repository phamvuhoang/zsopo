/** Money: integer VND. bigint in code, decimal integer string on the wire. */
export type Money = string;

export function fromMoney(m: Money | bigint): bigint {
  if (typeof m === "bigint") return m;
  if (!/^-?\d+$/.test(m)) throw new Error(`invalid Money: ${m}`);
  return BigInt(m);
}

export const toMoney = (v: bigint): Money => v.toString();

export function formatVnd(v: Money | bigint): string {
  const n = fromMoney(v);
  const abs = (n < 0n ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0n ? "-" : ""}${abs} đ`;
}
