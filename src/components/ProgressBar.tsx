import { EVENT_DEFINITIONS, FASE_NAMES } from "@/lib/events";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  completados: number;
  total: number;
  tiposRegistrados: Set<string>;
}

export function ProgressBar({ completados, total, tiposRegistrados }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;

  // Group events by fase
  const fases = new Map<number, typeof EVENT_DEFINITIONS>();
  EVENT_DEFINITIONS.forEach((def) => {
    const arr = fases.get(def.fase) || [];
    arr.push(def);
    fases.set(def.fase, arr);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {completados} de {total} eventos
        </span>
        <span className={cn("font-medium", pct === 100 ? "text-success" : "text-primary")}>
          {pct}%
        </span>
      </div>
      <div className="flex gap-1 h-2">
        {Array.from(fases.entries()).map(([fase, defs]) => {
          const faseCompletados = defs.filter((d) => tiposRegistrados.has(d.tipo_evento)).length;
          const fasePct = Math.round((faseCompletados / defs.length) * 100);
          return (
            <div
              key={fase}
              className="flex-1 relative group"
              title={`${FASE_NAMES[fase]}: ${faseCompletados}/${defs.length}`}
            >
              <div className="absolute inset-0 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    fasePct === 100 ? "bg-success" : fasePct > 0 ? "bg-primary" : "bg-secondary"
                  )}
                  style={{ width: `${fasePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {Array.from(fases.keys()).map((fase) => (
          <span key={fase}>F{fase}</span>
        ))}
      </div>
    </div>
  );
}
