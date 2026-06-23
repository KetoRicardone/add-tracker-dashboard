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

export function EventTimeline({ eventos }: EventTimelineProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tiposRegistrados = new Set(eventos.map((e) => e.tipo_evento));

  // Group events by fase
  const fases = new Map<number, (EventDefinition & { evento?: TrazEvento })[]>();
  EVENT_DEFINITIONS.forEach((def) => {
    const arr = fases.get(def.fase) || [];
    const evt = eventos.find((e) => e.tipo_evento === def.tipo_evento);
    arr.push({ ...def, evento: evt });
    fases.set(def.fase, arr);
  });

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderDatos = (datos: Record<string, unknown>) => {
    return (
      <div className="mt-2 rounded-lg bg-secondary/50 p-3 font-mono text-xs">
        <pre className="whitespace-pre-wrap break-all text-muted-foreground">
          {JSON.stringify(datos, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Array.from(fases.entries()).map(([fase, defs]) => {
        const faseCompletados = defs.filter((d) => d.evento).length;
        return (
          <div key={fase}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {FASE_NAMES[fase]}
              </h3>
              <span className="text-xs text-muted-foreground">
                {faseCompletados}/{defs.length}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-0.5">
              {defs.map((def) => {
                const completado = !!def.evento;
                const eventId = def.evento?.evento_id || def.tipo_evento;
                const isExpanded = expanded.has(eventId);
                const isGate = def.gate;

                return (
                  <div
                    key={eventId}
                    className={cn(
                      "rounded-lg border transition-all",
                      completado
                        ? "border-border bg-card/50"
                        : "border-dashed border-border/50 bg-transparent"
                    )}
                  >
                    <button
                      onClick={() => completado && toggle(eventId)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left",
                        completado && "cursor-pointer hover:bg-secondary/30"
                      )}
                    >
                      {/* Status icon */}
                      {completado ? (
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                      )}

                      {/* Event icon */}
                      <span className="text-lg flex-shrink-0">
                        {(() => {
                          const IconComp = EVENT_ICONS[def.icon];
                          return IconComp ? <IconComp className="h-4 w-4" /> : null;
                        })()}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              completado ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {def.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {def.rgan}
                          </span>
                          {isGate && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {completado ? (
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(def.evento!.fecha)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {def.evento!.responsable}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  def.evento!.resultado === "OK"
                                    ? "bg-success/20 text-success"
                                    : "bg-destructive/20 text-destructive"
                                )}
                              >
                                {def.evento!.resultado}
                              </span>
                            </span>
                          ) : (
                            def.descripcion
                          )}
                        </p>
                      </div>

                      {completado && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                            isExpanded && "rotate-180"
                          )}
                        />
                      )}
                    </button>

                    {/* Expanded detail */}
                    {completado && isExpanded && (
                      <div className="px-3 pb-3 border-t border-border/50">
                        <div className="pt-3 space-y-2">
                          {def.evento!.humedad_pct != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Humedad:</span>
                              <span className="font-medium">{def.evento!.humedad_pct}%</span>
                            </div>
                          )}
                          {def.evento!.total_caida_pct != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Caída total:</span>
                              <span className="font-medium">{def.evento!.total_caida_pct}%</span>
                            </div>
                          )}
                          {def.evento!.galpon && (
                            <div className="flex items-center gap-2 text-xs">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Galpón:</span>
                              <span className="font-medium">{def.evento!.galpon}</span>
                            </div>
                          )}
                          {renderDatos(def.evento!.datos || {})}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

