import { cn } from "@/lib/utils";
import { EstadoLote, ESTADO_LOTE_LABEL } from "@/lib/lotes";

// El estado del lote de PRODUCCIÓN se deriva de sus hitos (ver estadoDelLote).
// No es el estado_operacional de la trazabilidad: una estiba se alimenta de
// varios lotes de materia prima, así que no hay un único estado que copiar.
const TONO: Record<EstadoLote, string> = {
  EN_PROCESO: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  EMBOLSADO: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  PESADO: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  PCC_VALIDADO: "border-violet-500/30 bg-violet-500/10 text-violet-500",
  LIBERADO: "border-success/30 bg-success/10 text-success",
  BLOQUEADO: "border-destructive/30 bg-destructive/10 text-destructive",
  DESPACHADO: "border-border bg-secondary text-muted-foreground",
};

export function EstadoLoteBadge({ estado, className }: { estado: EstadoLote; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONO[estado],
        className
      )}
    >
      {ESTADO_LOTE_LABEL[estado]}
    </span>
  );
}

/** Badge del estado operacional del lote de materia prima (fsm_estado_def). */
export function EstadoMpBadge({
  estado,
  esExcepcion,
  className,
}: {
  estado: string | null;
  esExcepcion?: boolean;
  className?: string;
}) {
  if (!estado) {
    return (
      <span className={cn("text-[11px] text-muted-foreground", className)}>sin estado</span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        esExcepcion
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-primary",
        className
      )}
    >
      {estado.replace(/_/g, " ")}
    </span>
  );
}
