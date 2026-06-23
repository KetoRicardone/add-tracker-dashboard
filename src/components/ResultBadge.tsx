import { cn } from "@/lib/utils";
import { resultTone } from "@/lib/eventMeta";
import { CheckCircle2, AlertTriangle, XCircle, CircleDot } from "lucide-react";

const TONE_STYLES = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  neutral: "bg-secondary text-muted-foreground border-border",
} as const;

const TONE_ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  neutral: CircleDot,
} as const;

export function ResultBadge({ resultado, className }: { resultado?: string | null; className?: string }) {
  if (!resultado) return null;
  const tone = resultTone(resultado);
  const Icon = TONE_ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE_STYLES[tone],
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {resultado}
    </span>
  );
}
