// Allow-listed segment filter (mirrors crm.segment_ids). Built from URL query params on the CRM page.
export type SegmentFilter = { minVisits?: number; lastStayAfter?: string; lastStayBefore?: string; hasShopOrder?: boolean; source?: string; tag?: string; marketingConsent?: boolean };

export function filterFromParams(sp: Record<string, string | string[] | undefined>): SegmentFilter {
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] !== "" ? (sp[k] as string) : undefined);
  const date = (k: string) => (s(k) && /^\d{4}-\d{2}-\d{2}$/.test(s(k)!) ? s(k) : undefined);
  const bool = (k: string) => (s(k) === "1" ? true : s(k) === "0" ? false : undefined);
  const f: SegmentFilter = {
    minVisits: s("visits") ? Math.max(0, Number(s("visits")) || 0) : undefined, lastStayAfter: date("after"), lastStayBefore: date("before"),
    hasShopOrder: bool("shop"), source: s("source")?.slice(0, 40), tag: s("tag")?.slice(0, 40), marketingConsent: bool("consent"),
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as SegmentFilter;
}
