"use client";

import { Trazabilidad } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { GrainIcon, GrainBadge } from "./GrainIcon";
import { ResultBadge } from "./ResultBadge";
import { defForEvent } from "@/lib/events";
import { emojiForIcon } from "@/lib/eventMeta";
import { formatDate } from "@/lib/utils";
import { ArrowRight, Clock, FileText, Truck } from "lucide-react";

export function TrazabilidadCard({ traz }: { traz: Trazabilidad }) {
  const tiposRegistrados = new Set(traz.eventos.map((e) => e.tipo_evento));
  const ultimoEvento = traz.eventos[traz.eventos.length - 1];
  const ultimaDef = ultimoEvento ? defForEvent(ultimoEvento) : null;

  // CPs activas (cantidad de Cartas de Porte distintas en eventos vigentes).
  const cpCount = new Set(
    traz.eventos
      .map((e) => (e.datos?.cpe as string) || (e.datos?.cp_seleccionada as string) || "")
      .filter(Boolean)
  ).size;

  return (
    <a
      href={`/trazabilidad/${traz.trazabilidad_id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <GrainIcon codigo={traz.codigo_grano} size="lg" />
            <div>
              <h3 className="font-mono text-sm font-semibold tracking-tight">{traz.trazabilidad_id}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <GrainBadge codigo={traz.codigo_grano} />
                <span className="text-xs text-muted-foreground">
                  {traz.codigo_establecimiento} · {traz.campania}
                </span>
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-muted-foreground transition-colors group-hover:text-primary">
            <span className="text-xs">Ver</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {/* Progress */}
        <ProgressBar
          completados={traz.completados}
          total={traz.total_eventos}
          tiposRegistrados={tiposRegistrados}
        />

        {/* Last event */}
        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          {ultimoEvento ? (
            <>
              <span className="text-sm leading-none" aria-hidden>{emojiForIcon(ultimaDef?.icon)}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-foreground font-medium">{ultimaDef?.nombre || ultimoEvento.tipo_evento}</span>
              </span>
              <ResultBadge resultado={ultimoEvento.resultado} />
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 font-medium"
                title={`${cpCount} Carta(s) de Porte activa(s)`}
              >
                <Truck className="h-3 w-3" />{cpCount} {cpCount === 1 ? "CP" : "CPs"}
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Eventos">
                <FileText className="h-3 w-3" />{traz.eventos.length}
              </span>
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
