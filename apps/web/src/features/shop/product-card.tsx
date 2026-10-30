import { CHAKRA_LABEL, type Chakra } from "@zsopo/core";
import { Price } from "@zsopo/ui";
import Link from "next/link";
import type { ProductCard } from "./queries";

export function ProductTile({ p }: { p: ProductCard }) {
  return (
    <li className="relative flex flex-col rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="font-semibold"><Link href={`/shop/${p.slug}`} className="after:absolute after:inset-0 hover:underline">{p.name}</Link></h3>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-2)]">{p.summary}</p>
      {p.chakras.length > 0 && <p className="mt-1 text-xs text-[var(--ink-3)]">Luân xa {p.chakras.map((c) => CHAKRA_LABEL[c as Chakra]).join(", ")}</p>}
      <p className="mt-auto pt-3 font-semibold"><Price value={String(p.priceFrom)} prefix="Từ" /></p>
    </li>
  );
}
