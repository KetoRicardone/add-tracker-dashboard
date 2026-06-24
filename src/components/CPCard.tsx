"use client";

import { useState } from "react";
import { TrazEvento, Firma } from "@/lib/types";
import { EVENT_DEFINITIONS, defForEvent } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { emojiForIcon } from "@/lib/eventMeta";
import { DataBadge } from "./DataBadge";
import { EventCompactRow } from "./EventCompactRow";
import { Camera, CheckCircle2, ChevronDown, Circle, Clock, Eye, PenLine, ShieldAlert, Truck, User } from "lucide-react";

/** Mapea un grupo RGAN al evento_tipo de firma que lo cierra */
const GROUP_FIRMA_EVENTO: Record<string, string> = {
  "RGAN-38": "RGAN38_COMPLETO",
};

/** Agrupa eventos consecutivos que comparten el mismo `def.grupo` */
function buildEventGroups(evts: TrazEvento[]) {
  const groups: { grupo: string | null; evts: TrazEvento[] }[] = [];
  let current: { grupo: string | null; evts: TrazEvento[] } | null = null;

  for (const evt of evts) {
    const def = defForEvent(evt);
    const g = def?.grupo || null;

    if (current && current.grupo === g) {
      current.evts.push(evt);
    } else {
      if (current) groups.push(current);
      current = { grupo: g, evts: [evt] };
    }
  }
  if (current) groups.push(current);
  return groups;
}

export function CPCard({ cpe, evts, ocrEvt, doneCount, totalDefs, firmas = [] }: {
  cpe: string;
  evts: TrazEvento[];
  ocrEvt?: TrazEvento;
  doneCount: number;
  totalDefs: number;
  firmas?: Firma[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const completedTypes = new Set(evts.map((e) => e.tipo_evento));
  const ocrData = (ocrEvt?.datos || {}) as Record<string, string | number | null>;
  const ocrImageUrl: string | null = (typeof ocrData.url === "string" && ocrData.url) || (typeof ocrData.drive_url === "string" && ocrData.drive_url) || null;

  const nonOcrEvents = evts.filter((e) => e.tipo_evento !== "EV_OCR_CARTA_PORTE");
  const eventGroups = buildEventGroups(nonOcrEvents);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* CP Header (click para contraer/expandir) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn("w-full p-4 flex items-center justify-between bg-secondary/20 text-left hover:bg-secondary/30 transition-colors", !collapsed && "border-b border-border")}
      >
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-mono font-semibold text-sm">{cpe.startsWith("__") ? "Sin CP asignada" : `CP ${cpe}`}</h2>
            <p className="text-xs text-muted-foreground">{doneCount} de {totalDefs} eventos · {Math.round((doneCount / totalDefs) * 100)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
        </div>
      </button>

      {!collapsed && (<>

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
                {ocrData.fecha && <DataBadge label="Fecha" value={ocrData.fecha} />}
                {ocrData.grano && <DataBadge label="Grano" value={ocrData.grano} />}
                {ocrData.campania && <DataBadge label="Campaña" value={ocrData.campania} />}
                {ocrData.peso_bruto && <DataBadge label="Peso Bruto" value={`${ocrData.peso_bruto} kg`} />}
                {ocrData.peso_neto && <DataBadge label="Peso Neto" value={`${ocrData.peso_neto} kg`} />}
                {ocrData.remitente && <DataBadge label="Remitente" value={ocrData.remitente} />}
                {ocrData.transporte && <DataBadge label="Transporte" value={ocrData.transporte} />}
                {ocrData.chofer && <DataBadge label="Chofer" value={ocrData.chofer} />}
                {ocrData.domicilio && <DataBadge label="Domicilio" value={ocrData.domicilio} />}
                {ocrData.n_planta && <DataBadge label="Nº Planta" value={ocrData.n_planta} />}
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

      {/* Events — grouped when they share the same RGAN */}
      <div className="p-3 space-y-0.5">
        {eventGroups.map((group, gi) => {
          if (group.grupo) {
            // Grupo RGAN: los eventos del mismo formulario se dibujan conectados
            const groupDone = group.evts.length;
            const totalInGroup = EVENT_DEFINITIONS.filter((d) => d.grupo === group.grupo).length;
            const allDone = groupDone === totalInGroup;
            const groupDef = EVENT_DEFINITIONS.find((d) => d.grupo === group.grupo);
            const firmaEvento = group.grupo ? GROUP_FIRMA_EVENTO[group.grupo] : undefined;
            const firma = firmaEvento ? firmas.find((f) => f.evento_tipo === firmaEvento) : undefined;
            return (
              <div key={`${group.grupo}-${gi}`} className="rounded-lg border border-border/60 overflow-hidden">
                {/* Group header */}
                <div className={cn("flex items-center gap-2 px-3 py-2 text-xs font-medium", allDone ? "bg-success/10" : "bg-warning/10")}>
                  <span className="text-base leading-none" aria-hidden>{emojiForIcon(groupDef?.icon)}</span>
                  <span className={cn("font-mono font-semibold", allDone ? "text-success" : "text-warning")}>{group.grupo}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{groupDone}/{totalInGroup} partes</span>
                  {firma && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium" title={`Firmado por ${firma.firmante}`}>
                      <PenLine className="h-3 w-3" />Firmado · {firma.firmante}
                    </span>
                  )}
                  {allDone && <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />}
                  {!allDone && <span className="ml-auto text-[10px] text-warning">en progreso</span>}
                </div>
                {/* Group events */}
                <div className="divide-y divide-border/30">
                  {group.evts.map((evt) => {
                    const def = defForEvent(evt);
                    const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
                    return <EventCompactRow key={evt.evento_id} evt={evt} def={def} isOK={isOK} />;
                  })}
                </div>
              </div>
            );
          }

          // Evento sin grupo — se renderiza individualmente
          return group.evts.map((evt) => {
            const def = defForEvent(evt);
            const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
            return <EventCompactRow key={evt.evento_id} evt={evt} def={def} isOK={isOK} />;
          });
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

      </>)}
    </div>
  );
}
