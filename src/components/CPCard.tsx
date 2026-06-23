"use client";

import { useState } from "react";
import { TrazEvento } from "@/lib/types";
import { EVENT_DEFINITIONS } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { DataBadge } from "./DataBadge";
import { EventCompactRow } from "./EventCompactRow";
import { Camera, CheckCircle2, ChevronDown, Circle, Clock, Eye, ShieldAlert, Truck, User } from "lucide-react";

export function CPCard({ cpe, evts, ocrEvt, doneCount, totalDefs }: {
  cpe: string;
  evts: TrazEvento[];
  ocrEvt?: TrazEvento;
  doneCount: number;
  totalDefs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedTypes = new Set(evts.map((e) => e.tipo_evento));
  const ocrData = (ocrEvt?.datos || {}) as Record<string, unknown>;
  const ocrImageUrl = (ocrData.url as string) || (ocrData.drive_url as string) || null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* CP Header */}
      <div className="p-4 flex items-center justify-between bg-secondary/20 border-b border-border">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-mono font-semibold text-sm">CP {cpe}</h2>
            <p className="text-xs text-muted-foreground">{doneCount} de {totalDefs} eventos · {Math.round((doneCount / totalDefs) * 100)}%</p>
          </div>
        </div>
        <div className="flex gap-0.5 h-2">
          {[1, 2, 3, 4].map((fase) => {
            const faseDefs = EVENT_DEFINITIONS.filter((d) => d.fase === fase);
            const faseDone = faseDefs.filter((d) => completedTypes.has(d.tipo_evento)).length;
            const pct = Math.round((faseDone / faseDefs.length) * 100);
            return <div key={fase} className="w-5 h-full bg-secondary rounded-full overflow-hidden" title={`F${fase}: ${faseDone}/${faseDefs.length}`}>
              <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : pct > 0 ? "bg-primary" : "")} style={{ width: `${pct}%` }} />
            </div>;
          })}
        </div>
      </div>

      {/* OCR Block */}
      {ocrEvt && (
        <div className="border-b border-border/50">
          <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/20 transition-colors">
            <Camera className="h-5 w-5 text-success" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">OCR — Carta de Porte</span>
                <span className="text-[10px] bg-success/20 text-success rounded px-1.5 py-0.5 font-medium">{ocrEvt.resultado}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(ocrEvt.fecha)}</span>
                <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{ocrEvt.responsable}</span>
              </p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {ocrData.fecha && <DataBadge label="Fecha" value={ocrData.fecha as string} />}
                {ocrData.grano && <DataBadge label="Grano" value={ocrData.grano as string} />}
                {ocrData.campania && <DataBadge label="Campaña" value={ocrData.campania as string} />}
                {ocrData.peso_bruto && <DataBadge label="Peso Bruto" value={`${ocrData.peso_bruto} kg`} />}
                {ocrData.peso_neto && <DataBadge label="Peso Neto" value={`${ocrData.peso_neto} kg`} />}
                {ocrData.remitente && <DataBadge label="Remitente" value={ocrData.remitente as string} />}
                {ocrData.transporte && <DataBadge label="Transporte" value={ocrData.transporte as string} />}
                {ocrData.chofer && <DataBadge label="Chofer" value={ocrData.chofer as string} />}
                {ocrData.domicilio && <DataBadge label="Domicilio" value={ocrData.domicilio as string} />}
                {ocrData.n_planta && <DataBadge label="Nº Planta" value={ocrData.n_planta as string} />}
              </div>

              {ocrImageUrl && (
                <a href={ocrImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Eye className="h-3.5 w-3.5" />Ver imagen de la Carta de Porte
                </a>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Datos completos (JSON)</summary>
                <pre className="mt-2 rounded bg-secondary/30 p-2 font-mono text-[11px] whitespace-pre-wrap break-all">{JSON.stringify(ocrData, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Other Events */}
      <div className="p-3 space-y-0.5">
        {evts.filter((e) => e.tipo_evento !== "EV_OCR_CARTA_PORTE").map((evt) => {
          const def = EVENT_DEFINITIONS.find((d) => d.tipo_evento === evt.tipo_evento);
          const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
          return <EventCompactRow key={evt.evento_id} evt={evt} def={def} isOK={isOK} />;
        })}

        {/* Pending */}
        {EVENT_DEFINITIONS.filter((d) => d.tipo_evento !== "EV_OCR_CARTA_PORTE" && !completedTypes.has(d.tipo_evento)).map((def) => (
          <div key={def.tipo_evento} className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border/40 opacity-40">
            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{def.nombre}</span>
            <span className="text-xs text-muted-foreground font-mono">{def.rgan}</span>
            {def.gate && <ShieldAlert className="h-3 w-3 text-amber-400/50" />}
          </div>
        ))}
      </div>
    </div>
  );
}
