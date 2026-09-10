import { TrazEvento } from "@/lib/types";
import { EVENT_DEFINITIONS, GRAIN_NAMES } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { Calendar, Filter, ArrowRight } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Un evento tal como lo devuelve /api/eventos: los de lote y los de planta
 * mezclados y ordenados por fecha. Los de planta (RGAN-40, RGAN-80) traen
 * `trazabilidad_id` en null — no cuelgan de ningún lote (ADR-001) — así que
 * no se puede linkear a la ficha de una trazabilidad.
 */
type EventoListado = TrazEvento & {
  trazabilidad_id: string | null;
  codigo_grano: string | null;
  campania: string | null;
  ambito?: "LOTE" | "PLANTA";
  planta_codigo?: string | null;
  turno?: string | null;
};

async function getEventos(): Promise<EventoListado[]> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/eventos?limit=200`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" }, // la API exige sesión (middleware)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.eventos || [];
  } catch {
    return [];
  }
}

export default async function EventosPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_EVENTOS"))) {
    return <SinPermiso permiso="PANEL_EVENTOS" detalle="Tu rol no puede ver el historial de eventos." />;
  }

  const eventos = await getEventos();
  const hoy = new Date().toISOString().split("T")[0];
  const eventosHoy = eventos.filter((e) => e.fecha?.startsWith(hoy));

  /**
   * Subtítulo de la fila. Un evento de lote se identifica por su trazabilidad y
   * su grano; uno de planta, por la planta y el turno — no tiene ninguno de los
   * otros dos.
   */
  const contexto = (evt: EventoListado) =>
    evt.ambito === "PLANTA"
      ? [evt.planta_codigo, evt.turno ? `Turno ${evt.turno}` : null].filter(Boolean).join(" · ")
      : `${evt.trazabilidad_id} · ${GRAIN_NAMES[evt.codigo_grano || ""] || evt.codigo_grano}`;

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
              const esPlanta = evt.ambito === "PLANTA";
              const cuerpo = (
                <>
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      esPlanta ? "bg-muted-foreground" : "bg-success"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{def?.nombre || evt.tipo_evento}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {def?.rgan}
                      </span>
                      {esPlanta && (
                        <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-secondary text-muted-foreground">
                          Planta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{contexto(evt)}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{formatDate(evt.fecha)?.split(",")[1]?.trim() || formatDate(evt.fecha)}</p>
                    <p className="text-[10px]">{evt.responsable}</p>
                  </div>
                </>
              );

              // Sin lote no hay ficha a la que ir: la fila se muestra igual pero
              // no es un link muerto a /trazabilidad/null.
              return esPlanta ? (
                <div key={evt.evento_id} className="flex items-center gap-3 rounded-lg p-3">
                  {cuerpo}
                </div>
              ) : (
                <Link
                  key={evt.evento_id}
                  href={`/trazabilidad/${evt.trazabilidad_id}`}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-colors group"
                >
                  {cuerpo}
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
              const esPlanta = evt.ambito === "PLANTA";
              const cuerpo = (
                <>
                  <div
                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      esPlanta ? "bg-muted-foreground/60" : "bg-primary/60"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{def?.nombre || evt.tipo_evento}</span>
                    <span className="text-xs text-muted-foreground ml-2">{contexto(evt)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(evt.fecha)}</span>
                </>
              );

              return esPlanta ? (
                <div key={evt.evento_id} className="flex items-center gap-3 rounded-lg p-2.5">
                  {cuerpo}
                </div>
              ) : (
                <Link
                  key={evt.evento_id}
                  href={`/trazabilidad/${evt.trazabilidad_id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-secondary/30 transition-colors group"
                >
                  {cuerpo}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
