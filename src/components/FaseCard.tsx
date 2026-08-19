"use client";

import { useState } from "react";
import { TrazEvento, Firma, EventDefinition } from "@/lib/types";
import { defForEvent, stepKey, stepKeyForEvent } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { emojiForIcon } from "@/lib/eventMeta";
import { EventCompactRow } from "./EventCompactRow";
import { CheckCircle2, ChevronDown, Circle, Factory, PenLine, Ship, ShieldAlert } from "lucide-react";

/**
 * Una corrida de proceso puede tomar big bags de varias Cartas de Porte, y el
 * bot emite un evento por CP. Los eventos de una misma corrida comparten el
 * timestamp exacto porque salen de un único INSERT y `fecha_hora_evento` usa
 * DEFAULT now(), que en Postgres es de transacción. Agrupar por fecha reconstruye
 * la operación sin necesidad de un id extra, y funciona sobre lo ya registrado.
 */
type Bloque =
  | { tipo: "corrida"; fecha: string; evts: TrazEvento[] }
  | { tipo: "suelto"; evt: TrazEvento };

function armarBloques(evts: TrazEvento[]): Bloque[] {
  const bloques: Bloque[] = [];
  const indicePorFecha = new Map<string, number>();

  for (const evt of evts) {
    if (evt.tipo_evento !== "EV_INGRESO_A_PROCESO") {
      bloques.push({ tipo: "suelto", evt });
      continue;
    }
    const yaVisto = indicePorFecha.get(evt.fecha);
    if (yaVisto !== undefined) {
      const b = bloques[yaVisto];
      if (b.tipo === "corrida") b.evts.push(evt);
      continue;
    }
    indicePorFecha.set(evt.fecha, bloques.length);
    bloques.push({ tipo: "corrida", fecha: evt.fecha, evts: [evt] });
  }
  return bloques;
}

function cpeDe(evt: TrazEvento): string {
  const c = (evt.datos || {}).cpe;
  return typeof c === "string" && c ? c : "";
}

function bigBagsDe(evt: TrazEvento): number {
  const d = evt.datos || {};
  if (typeof d.cantidad === "number") return d.cantidad;
  return Array.isArray(d.precintos) ? d.precintos.length : 0;
}

function resumenCorrida(evts: TrazEvento[]) {
  let bigBags = 0;
  let kg = 0;
  const cps = new Set<string>();
  for (const e of evts) {
    bigBags += bigBagsDe(e);
    const peso = (e.datos || {}).peso_total;
    if (typeof peso === "number") kg += peso;
    const cpe = cpeDe(e);
    if (cpe) cps.add(cpe);
  }
  return { bigBags, kg, cps: cps.size };
}

/**
 * Tarjeta de una fase del circuito a nivel LOTE (no por Carta de Porte).
 * Desde el ingreso a proceso la CP deja de ser la unidad: la línea se arma por
 * establecimiento y grano, y el control de proceso es del turno.
 */
export function FaseCard({ titulo, subtitulo, variante, evts, defs, firmas = [], canEdit = false, actorNombre = "", humedadMaxGrano = null }: {
  titulo: string;
  subtitulo: string;
  variante: "proceso" | "salida";
  evts: TrazEvento[];
  /** Pasos del circuito que esta tarjeta cubre. */
  defs: EventDefinition[];
  firmas?: Firma[];
  canEdit?: boolean;
  actorNombre?: string;
  humedadMaxGrano?: number | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const completedTypes = new Set(evts.map(stepKeyForEvent));
  const doneCount = defs.filter((d) => completedTypes.has(stepKey(d))).length;
  const pct = defs.length > 0 ? Math.round((doneCount / defs.length) * 100) : 0;
  const bloques = armarBloques(evts);
  const Icono = variante === "proceso" ? Factory : Ship;

  function filaEvento(evt: TrazEvento, etiqueta?: string) {
    const def = defForEvent(evt);
    const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
    const firma = firmas.find((f) => f.evento_tipo === evt.tipo_evento);
    return (
      <EventCompactRow
        key={evt.evento_id}
        evt={evt}
        def={def}
        isOK={isOK}
        canEdit={canEdit}
        actorNombre={actorNombre}
        firmante={firma?.firmante}
        humedadMaxGrano={humedadMaxGrano}
        etiqueta={etiqueta}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "w-full flex items-center justify-between gap-3 p-4 text-left bg-secondary/20 hover:bg-secondary/30 transition-colors",
          !collapsed && "border-b border-border"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icono className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm uppercase tracking-wide">{titulo}</h3>
            <p className="text-xs text-muted-foreground">{subtitulo} · {doneCount} de {defs.length} pasos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="h-2 w-20 rounded-full bg-secondary overflow-hidden" title={`${doneCount}/${defs.length} pasos`}>
            <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
        </div>
      </button>

      {!collapsed && (
        <div className="p-3 space-y-0.5">
          {bloques.map((bloque) => {
            // Una corrida de un solo evento no necesita carcasa: es una fila más.
            if (bloque.tipo === "suelto") return filaEvento(bloque.evt);
            if (bloque.evts.length === 1) return filaEvento(bloque.evts[0]);

            const { bigBags, kg, cps } = resumenCorrida(bloque.evts);
            const def = defForEvent(bloque.evts[0]);
            const firma = firmas.find((f) => f.evento_tipo === "EV_INGRESO_A_PROCESO");
            return (
              <div key={`corrida-${bloque.fecha}`} className="rounded-lg border border-border/60 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-primary/10 flex-wrap">
                  <span className="text-base leading-none" aria-hidden>{emojiForIcon(def?.icon)}</span>
                  <span className="font-mono font-semibold text-primary">{def?.rgan || "RGAN-41"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {bigBags} big bags{kg > 0 && ` · ${kg.toLocaleString("es-AR")} kg`} · {cps} {cps === 1 ? "Carta de Porte" : "Cartas de Porte"}
                  </span>
                  {firma && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-medium" title={`Firmado por ${firma.firmante}`}>
                      <PenLine className="h-3 w-3" />Firmado · {firma.firmante}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(bloque.fecha)}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </div>
                <div className="divide-y divide-border/30">
                  {bloque.evts.map((evt) => {
                    const cpe = cpeDe(evt);
                    return filaEvento(evt, `${cpe ? `CP ${cpe}` : "Sin CP"} · ${bigBagsDe(evt)} BB`);
                  })}
                </div>
              </div>
            );
          })}

          {defs.filter((d) => !completedTypes.has(stepKey(d))).map((def) => (
            <div key={stepKey(def)} className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border/40 opacity-40">
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{def.nombre}</span>
              <span className="text-xs text-muted-foreground font-mono">{def.rgan}</span>
              {def.gate && <ShieldAlert className="h-3 w-3 text-amber-400/50" />}
            </div>
          ))}

          {evts.length === 0 && defs.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Sin pasos definidos para esta fase.</p>
          )}
        </div>
      )}
    </div>
  );
}
