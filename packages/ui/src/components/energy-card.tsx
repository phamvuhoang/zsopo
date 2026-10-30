import { CHAKRA_LABEL, type EnergyCardData } from "@zsopo/core";

export const ENERGY_DISCLAIMER = "Nội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-[var(--line)] py-2 text-sm">
      <dt className="text-[var(--ink-3)]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Shared Energy Card (US-NRG-02). Chakra colour is content coding and always carries a text label. */
export function EnergyCard({ card, headingLevel = 2 }: { card: EnergyCardData; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as const;
  return (
    <section aria-label="Bảng năng lượng" className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <p className="text-xs font-semibold tracking-wide text-[var(--accent-ink)] uppercase">Bảng năng lượng</p>
      <H className="mt-1 text-lg font-semibold">{card.title}</H>
      <dl className="mt-3">
        <Row label="Công dụng">{card.purpose}</Row>
        <Row label="Nguồn gốc">{card.origin}</Row>
        <Row label="Cách dùng">{card.usage}</Row>
        {card.frequency && <Row label="Tần số">{card.frequency}</Row>}
        {card.stones.length > 0 && <Row label="Đá">{card.stones.join(", ")}</Row>}
        {card.symbols.length > 0 && <Row label="Biểu tượng">{card.symbols.join(", ")}</Row>}
        {card.chakras.length > 0 && (
          <Row label="Luân xa">
            <ul className="flex flex-wrap gap-2">
              {card.chakras.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: `var(--chakra-${c.replace("_", "-")})` }} />
                  {CHAKRA_LABEL[c]}
                </li>
              ))}
            </ul>
          </Row>
        )}
        {card.bovisReference != null && (
          <Row label="Bovis">{card.bovisReference.toLocaleString("vi-VN")} (chỉ số tham khảo theo phương pháp đo của ZSOPO)</Row>
        )}
      </dl>
      {card.ritualVideoUrl && (
        <a href={card.ritualVideoUrl} className="mt-3 inline-block text-sm underline" rel="noopener noreferrer" target="_blank">
          Xem video hướng dẫn nghi lễ
        </a>
      )}
      <p className="mt-3 text-xs text-[var(--ink-3)]">{ENERGY_DISCLAIMER}</p>
    </section>
  );
}
