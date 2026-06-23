"use client";

import { Trazabilidad } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { GrainIcon, GrainBadge } from "./GrainIcon";
import { EVENT_DEFINITIONS } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Clock, CheckCircle2 } from "lucide-react";

export function TrazabilidadCard({ traz }: { traz: Trazabilidad }) {
  const tiposRegistrados = new Set(traz.eventos.map((e) => e.tipo_evento));
  const ultimoEvento = traz.eventos[traz.eventos.length - 1];
  const ultimaDef = ultimoEvento
    ? EVENT_DEFINITIONS.find((d) => d.tipo_evento === ultimoEvento.tipo_evento)
    : null;

  return (
    <a
      href={`/trazabilidad/${traz.trazabilidad_id}`}
      className="group block rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <GrainIcon codigo={traz.codigo_grano} size="lg" />
            <div>
              <h3 className="font-mono font-semibold text-sm tracking-tight">
                {traz.trazabilidad_id}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <GrainBadge codigo={traz.codigo_grano} />
                <span className="text-xs text-muted-foreground">
                  {traz.codigo_establecimiento} · {traz.campania}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
            <span className="text-xs">Ver</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Progress */}
        <ProgressBar
          completados={traz.completados}
          total={traz.total_eventos}
          tiposRegistrados={tiposRegistrados}
        />

        {/* Last event */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
          {ultimoEvento ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>
                Último: <span className="text-foreground font-medium">{ultimaDef?.nombre || ultimoEvento.tipo_evento}</span>
              </span>
              <span>·</span>
              <Clock className="h-3 w-3" />
              <span>{formatDate(ultimoEvento.fecha)}</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>Creada: {formatDate(traz.fecha_apertura)}</span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}
