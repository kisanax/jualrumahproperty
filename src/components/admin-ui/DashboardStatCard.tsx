import type { ElementType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
} as const;

type StatTone = keyof typeof TONE_CLASSES;

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tone: StatTone;
}) {
  return (
    <Card className="h-full rounded-xl border-border/80 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", TONE_CLASSES[tone])}>
          <Icon size={21} aria-hidden="true" />
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}
