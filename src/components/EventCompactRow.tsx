"use client";

import { useState } from "react";
import { TrazEvento } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import { emojiForIcon } from "@/lib/eventMeta";
import { ResultBadge } from "./ResultBadge";
import { EventDataView } from "./EventDataView";
import { CheckCircle2, ChevronDown, MessageSquareText, ShieldAlert } from "lucide-react";

/** Extrae observaciones de datos_evento — puede ser string o array */
function getObservaciones(datos: Record<string, unknown>): string | null {
  const obs = datos.observaciones || datos.observacion || datos.observaciones_finales;
  if (!obs) return null;
  if (typeof obs === "string" && obs.length > 0) return obs;
  if (Array.isArray(obs) && obs.length > 0) {
    return obs.filter((o: unknown) => typeof o === "string" && o.trim()).join(" · ");
  }
  return null;
}

export function EventCompactRow({ evt, def, isOK }: {
  evt: TrazEvento;
  def?: { nombre: string; rgan: string; icon: string; gate: boolean };
  isOK: boolean;
}) {
  const [open, setOpen] = useState(false);
  const datos = evt.datos || {};
  const observaciones = getObservaciones(datos);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors text-left"
      >
        <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0", isOK ? "text-success" : "text-destructive")} />
        <span className="text-base leading-none flex-shrink-0" aria-hidden>{emojiForIcon(def?.icon)}</span>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{def?.nombre || evt.tipo_evento}</span>
          <span className="text-[10px] text-muted-foreground font-mono bg-secondary/60 rounded px-1.5 py-0.5">{def?.rgan}</span>
          {def?.gate && <span title="Gate de control"><ShieldAlert className="h-3 w-3 text-warning" /></span>}
          {observaciones && <span title="Tiene observaciones"><MessageSquareText className="h-3 w-3 text-blue-400 flex-shrink-0" /></span>}
        </div>
        <ResultBadge resultado={evt.resultado} className="hidden sm:inline-flex" />
        <span className="text-[11px] text-muted-foreground hidden md:inline">{formatDate(evt.fecha)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>

      {/* Observaciones — visibles sin expandir */}
      {observaciones && (
        <div className="ml-9 mr-2 mb-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs text-blue-200">
          <span className="font-medium">📝 Observaciones:</span> {observaciones}
        </div>
      )}

      {open && (
        <div className="ml-9 mr-2 mb-2 space-y-3">
          {/* Meta línea: responsable + fecha + resultado (siempre visible al abrir) */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>👤 {evt.responsable || "—"}</span>
            <span>🕑 {formatDate(evt.fecha)}</span>
            <ResultBadge resultado={evt.resultado} />
          </div>
          <EventDataView datos={datos} />
          <details className="text-[11px]">
            <summary className="cursor-pointer text-muted-foreground/70 hover:text-muted-foreground">Ver datos crudos (JSON)</summary>
            <pre className="mt-2 rounded bg-secondary/30 p-2 font-mono text-[10px] whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(datos, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
