"use client";

import { TrazEvento, EventDefinition } from "@/lib/types";
import { EVENT_DEFINITIONS, FASE_NAMES } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  ShieldAlert,
  ChevronDown,
  User,
  FileText,
  File,
  Truck,
} from "lucide-react";
import { useState } from "react";

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera: ({ className }) => <span className={className}>📷</span>,
  Truck: ({ className }) => <span className={className}>🚛</span>,
  FlaskConical: ({ className }) => <span className={className}>🧪</span>,
  PackageCheck: ({ className }) => <span className={className}>🏭</span>,
  ArrowRightLeft: ({ className }) => <span className={className}>🔄</span>,
  Gauge: ({ className }) => <span className={className}>📊</span>,
  Trash2: ({ className }) => <span className={className}>🗑️</span>,
  Repeat: ({ className }) => <span className={className}>🔁</span>,
  Package: ({ className }) => <span className={className}>📦</span>,
  Scale: ({ className }) => <span className={className}>⚖️</span>,
  Magnet: ({ className }) => <span className={className}>🧲</span>,
  ShieldCheck: ({ className }) => <span className={className}>🛡️</span>,
  Ship: ({ className }) => <span className={className}>🚢</span>,
  ClipboardCheck: ({ className }) => <span className={className}>📋</span>,
  Boxes: ({ className }) => <span className={className}>📥</span>,
};

interface EventTimelineProps {
  eventos: TrazEvento[];
}

function getCPE(evt: TrazEvento): string | null {
  const d = evt.datos || {};
  return (d.cpe as string) || (d.cp_seleccionada as string) || null;
}

function groupByCPE(eventos: TrazEvento[]): Map<string, TrazEvento[]> {
  const groups = new Map<string, TrazEvento[]>();
  const sinCP: TrazEvento[] = [];

  eventos.forEach((evt) => {
    const cpe = getCPE(evt);
    if (cpe) {
      const arr = groups.get(cpe) || [];
      arr.push(evt);
      groups.set(cpe, arr);
    } else {
      sinCP.push(evt);
    }
  });

  if (sinCP.length > 0) groups.set("__sin_cp__", sinCP);
  return groups;
}

export function EventTimeline({ eventos }: EventTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const cpGroups = groupByCPE(eventos);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderEventRow = (evt: TrazEvento, isLast: boolean) => {
    const def = EVENT_DEFINITIONS.find((d) => d.tipo_evento === evt.tipo_evento);
    const isExpanded = expanded.has(evt.evento_id);
    const isOK = evt.resultado === "OK" || evt.resultado === "APROBADO";
    const isGate = def?.gate || false;

    return (
      <div
        key={evt.evento_id}
        className={cn(
          "rounded-lg border transition-all border-border bg-card/50",
          !isLast && "mb-1"
        )}
      >
        <button
          onClick={() => toggle(evt.evento_id)}
          className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-secondary/30"
        >
          <CheckCircle2 className={cn("h-5 w-5 flex-shrink-0", isOK ? "text-success" : "text-destructive")} />
          <span className="text-lg flex-shrink-0">
            {def && EVENT_ICONS[def.icon] ? (() => { const I = EVENT_ICONS[def.icon]; return <I className="h-4 w-4" />; })() : null}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{def?.nombre || evt.tipo_evento}</span>
              <span className="text-xs text-muted-foreground font-mono">{def?.rgan}</span>
              {isGate && <ShieldAlert className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(evt.fecha)}</span>
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{evt.responsable}</span>
              <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", isOK ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                {evt.resultado}
              </span>
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform flex-shrink-0", isExpanded && "rotate-180")} />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 border-t border-border/50">
            <div className="pt-3">
              <div className="rounded-lg bg-secondary/50 p-3 font-mono text-xs">
                <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                  {JSON.stringify(evt.datos || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (cpGroups.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
        <File className="h-8 w-8 mb-2 opacity-40" />
        Sin eventos registrados
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(cpGroups.entries()).map(([cpe, evts]) => {
        const isSinCP = cpe === "__sin_cp__";
        const completados = evts.length;
        const total = EVENT_DEFINITIONS.length;
        const pct = Math.round((completados / total) * 100);

        return (
          <div key={cpe}>
            {/* CP Header */}
            {!isSinCP && (
              <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <Truck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">CP {cpe}</h3>
                  <p className="text-xs text-muted-foreground">
                    {completados} de {total} eventos completados ({pct}%)
                  </p>
                </div>
                <div className="flex gap-0.5 h-2">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const faseEvts = EVENT_DEFINITIONS.filter((d) => d.fase === i + 1);
                    const faseDone = faseEvts.filter((d) => evts.some((e) => e.tipo_evento === d.tipo_evento)).length;
                    const fasePct = Math.round((faseDone / faseEvts.length) * 100);
                    return (
                      <div key={i} className="w-6 h-full bg-secondary rounded-full overflow-hidden" title={`F${i + 1}: ${faseDone}/${faseEvts.length}`}>
                        <div className={cn("h-full rounded-full transition-all", fasePct === 100 ? "bg-success" : fasePct > 0 ? "bg-primary" : "bg-transparent")} style={{ width: `${fasePct}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Events for this CP */}
            <div className="space-y-0">
              {evts.map((evt, idx) => renderEventRow(evt, idx === evts.length - 1))}
            </div>

            {/* Pending events for this CP */}
            {!isSinCP && (
              <div className="mt-2 space-y-0.5">
                {EVENT_DEFINITIONS.filter((def) => !evts.some((e) => e.tipo_evento === def.tipo_evento)).map((def) => (
                  <div key={def.tipo_evento} className="rounded-lg border border-dashed border-border/40 bg-transparent p-3 flex items-center gap-3 opacity-50">
                    <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                    <span className="text-lg flex-shrink-0">
                      {EVENT_ICONS[def.icon] ? (() => { const I = EVENT_ICONS[def.icon]; return <I className="h-4 w-4" />; })() : null}
                    </span>
                    <div>
                      <span className="text-sm text-muted-foreground">{def.nombre}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{def.rgan}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
