import { TrazEvento } from "@/lib/types";
import { EVENT_DEFINITIONS, GRAIN_NAMES } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { Calendar, Filter, ArrowRight } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

async function getEventos(): Promise<(TrazEvento & { trazabilidad_id: string; codigo_grano: string; campania: string })[]> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/eventos?limit=200`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.eventos || [];
  } catch {
    return [];
  }
}

export default async function EventosPage() {
  const eventos = await getEventos();
  const hoy = new Date().toISOString().split("T")[0];
  const eventosHoy = eventos.filter((e) => e.fecha?.startsWith(hoy));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Eventos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro cronológico de todos los eventos
        </p>
      </div>

      {/* Today's events */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Hoy — {eventosHoy.length} eventos</h2>
        </div>

        {eventosHoy.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay eventos registrados hoy.
          </p>
        ) : (
          <div className="space-y-1">
            {eventosHoy.map((evt) => {
              const def = EVENT_DEFINITIONS.find((d) => d.tipo_evento === evt.tipo_evento);
              return (
                <Link
                  key={evt.evento_id}
                  href={`/trazabilidad/${evt.trazabilidad_id}`}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="h-2 w-2 rounded-full bg-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{def?.nombre || evt.tipo_evento}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {def?.rgan}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {evt.trazabilidad_id} · {GRAIN_NAMES[evt.codigo_grano] || evt.codigo_grano}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{formatDate(evt.fecha)?.split(",")[1]?.trim() || formatDate(evt.fecha)}</p>
                    <p className="text-[10px]">{evt.responsable}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* All events */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Todos los eventos ({eventos.length})</h2>

        {eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay eventos registrados.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {eventos.slice(0, 100).map((evt) => {
              const def = EVENT_DEFINITIONS.find((d) => d.tipo_evento === evt.tipo_evento);
              return (
                <Link
                  key={evt.evento_id}
                  href={`/trazabilidad/${evt.trazabilidad_id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{def?.nombre || evt.tipo_evento}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {evt.trazabilidad_id}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(evt.fecha)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
