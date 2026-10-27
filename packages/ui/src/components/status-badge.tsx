import { cn } from "../cn";

const TONE = {
  neutral: "bg-[var(--surface-2)] text-[var(--ink-2)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
} as const;

export type Tone = keyof typeof TONE;

export function StatusBadge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex flex-none items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}
