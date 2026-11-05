import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Badge status ala shadcn (badge.tsx) dengan 5 tone semantik.
 * Warna pakai token desain project + shade Tailwind, aman di tema terang & gelap.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  info: "bg-blue-500/15 text-blue-600 ring-1 ring-inset ring-blue-500/25 dark:text-blue-400",
  success: "bg-emerald-500/15 text-emerald-600 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/35 dark:text-amber-400",
  danger: "bg-red-500/15 text-red-600 ring-1 ring-inset ring-red-500/25 dark:text-red-400",
};

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
