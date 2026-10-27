import { formatVnd, type Money } from "@zsopo/core";
import { cn } from "../cn";

/** VND price, never wraps ("1.250.000 đ"). */
export function Price({ value, prefix, className }: { value: Money | bigint; prefix?: string; className?: string }) {
  return (
    <span className={cn("flex-none whitespace-nowrap tabular-nums", className)}>
      {prefix && <span className="font-normal text-[var(--ink-3)]">{prefix} </span>}
      {formatVnd(value)}
    </span>
  );
}
