"use client";

import { useState } from "react";
import { TrazEvento, Firma, EventDefinition, ConsumoCP } from "@/lib/types";
import { buildEventGroups, defForEvent, GROUP_FIRMA_EVENTO, stepKey, stepKeyForEvent } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { emojiForIcon } from "@/lib/eventMeta";
import { DataBadge } from "./DataBadge";
import { EventCompactRow } from "./EventCompactRow";
import { CpAnularButton } from "./CpAnularButton";
import { Camera, CheckCircle2, ChevronDown, Circle, Clock, Eye, PenLine, ShieldAlert, Truck, User } from "lucide-react";

/** Barra de big bags de la CP: cuántos entraron a la línea y cuántos siguen en depósito. */
function ConsumoBigBags({ consumo }: { consumo: ConsumoCP }) {
  const { recibidos, enProceso, kgRecibidos, kgEnProceso } = consumo;
  const enDeposito = recibidos - enProceso;
  const pct = recibidos > 0 ? Math.round((enProceso / recibidos) * 100) : 0;

  return (
    <div className="px-4 pb-3 pt-1 bg-secondary/20 border-b border-border/50">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Big bags de esta CP
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {recibidos} recibidos{kgRecibidos > 0 && ` · ${kgRecibidos.toLocaleString("es-AR")} kg`}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary" role="img"
           aria-label={`${enProceso} de ${recibidos} big bags en proceso, ${enDeposito} en depósito`}>
        <div className="bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-4 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" />
          {enProceso} en proceso{kgEnProceso > 0 && ` · ${kgEnProceso.toLocaleString("es-AR")} kg`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-secondary border border-border" />
          {enDeposito} en depósito
        </span>
      </div>
    </div>
  );
}

export function CPCard({ cpe, evts, ocrEvt, defs, consumo, firmas = [], trazabilidadId, canEdit = false, actorNombre = "", humedadMaxGrano = null }: {
  cpe: string;
  evts: TrazEvento[];
  ocrEvt?: TrazEvento;
  /** Pasos del circuito que esta tarjeta cubre. La CP solo gobierna la recepción. */
  defs: EventDefinition[];
  /** Big bags recibidos vs. ya ingresados a proceso. Ausente si la CP no tiene RGAN-55. */
  consumo?: ConsumoCP;
  firmas?: Firma[];
  trazabilidadId: string;
  canEdit?: boolean;
  actorNombre?: string;
  /** Humedad máxima vigente del grano, para marcar los valores fuera de norma. */
  humedadMaxGrano?: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // solapas comprimidas por defecto
  // Por paso del circuito, no por tipo_evento: RGAN-38 P2 y RGAN-39 comparten tipo.
  const completedTypes = new Set(evts.map(stepKeyForEvent));
  const doneCount = defs.filter((d) => completedTypes.has(stepKey(d))).length;
  const pct = defs.length > 0 ? Math.round((doneCount / defs.length) * 100) : 0;
  const ocrData = (ocrEvt?.datos || {}) as Record<string, string | number | null>;
  const ocrImageUrl: string | null = (typeof ocrData.url === "string" && ocrData.url) || (typeof ocrData.drive_url === "string" && ocrData.drive_url) || null;

  const nonOcrEvents = evts.filter((e) => e.tipo_evento !== "EV_OCR_CARTA_PORTE");
  const eventGroups = buildEventGroups(nonOcrEvents);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* CP Header (click para contraer/expandir) */}
      <div className={cn("flex items-stretch bg-secondary/20", !collapsed && !consumo && "border-b border-border")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex flex-1 items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-mono font-semibold text-sm">{cpe.startsWith("__") ? "Sin CP asignada" : `CP ${cpe}`}</h3>
              <p className="text-xs text-muted-foreground">{doneCount} de {defs.length} pasos · {pct}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Una sola barra: la tarjeta cubre una fase, cuatro barritas ya no dicen nada. */}
            <div className="h-2 w-20 rounded-full bg-secondary overflow-hidden" title={`${doneCount}/${defs.length} pasos de recepción`}>
              <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
          </div>
        </button>
        {canEdit && (
          <div className="flex items-center pr-4">
            <CpAnularButton trazabilidadId={trazabilidadId} cpe={cpe} nombre={actorNombre} sinCp={cpe.startsWith("__")} />
          </div>
        )}
      </div>

      {/* Consumo — visible aunque la tarjeta esté contraída: es lo que se mira de un vistazo */}
      {consumo && consumo.recibidos > 0 && <ConsumoBigBags consumo={consumo} />}

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
            const totalInGroup = defs.filter((d) => d.grupo === group.grupo).length;
            const allDone = groupDone === totalInGroup;
            const groupDef = defs.find((d) => d.grupo === group.grupo);
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
                    return <EventCompactRow key={evt.evento_id} evt={evt} def={def} isOK={isOK} canEdit={canEdit} actorNombre={actorNombre} firmante={firma?.firmante} humedadMaxGrano={humedadMaxGrano} />;
                  })}
                </div>
              </div>
            );
          }

          // Evento sin grupo — se renderiza individualmente. Su firma (si existe)
          // se registra con evento_tipo = tipo_evento; las de los grupos usan un
          // tipo propio (RGAN38_COMPLETO) y se muestran en el encabezado.
          return group.evts.map((evt) => {
            const def = defForEvent(evt);
            const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
            const firma = firmas.find((f) => f.evento_tipo === evt.tipo_evento);
            return <EventCompactRow key={evt.evento_id} evt={evt} def={def} isOK={isOK} canEdit={canEdit} actorNombre={actorNombre} firmante={firma?.firmante} humedadMaxGrano={humedadMaxGrano} />;
          });
        })}

        {/* Pending */}
        {defs.filter((d) => d.tipo_evento !== "EV_OCR_CARTA_PORTE" && !completedTypes.has(stepKey(d))).map((def) => (
          <div key={stepKey(def)} className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border/40 opacity-40">
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
