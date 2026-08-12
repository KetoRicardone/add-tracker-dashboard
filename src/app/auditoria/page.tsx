import { headers } from "next/headers";
import Link from "next/link";
import { ShieldCheck, Ban, PencilLine, RotateCcw, ArrowRight } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { EVENT_DEFINITIONS, GRAIN_NAMES } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Movimiento {
  anulacion_id: string;
  evento_id: string;
  anulado_at: string;
  motivo: string | null;
  evento_reemplazo_id: string | null;
  es_correccion: boolean;
  actor: string;
  actor_rol: string | null;
  tipo_evento: string | null;
  estado_evento: string | null;
  evento_fecha: string | null;
  responsable_nombre: string | null;
  trazabilidad_id: string | null;
  codigo_rgan: string | null;
  cpe: string | null;
  codigo_grano: string | null;
  estado_operacional: string | null;
}

interface Reversion {
  trazabilidad_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha_hora: string;
}

async function cargar(): Promise<{ movimientos: Movimiento[]; reversiones: Reversion[] }> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const res = await fetch(`${proto}://${host}/api/auditoria`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" },
    });
    if (!res.ok) return { movimientos: [], reversiones: [] };
    const d = await res.json();
    return { movimientos: d.movimientos || [], reversiones: d.reversiones || [] };
  } catch {
    return { movimientos: [], reversiones: [] };
  }
}

function etiquetaEvento(tipo: string | null, rgan: string | null): string {
  if (rgan) {
    const porRgan = EVENT_DEFINITIONS.find((d) => d.rgan === rgan);
    if (porRgan) return porRgan.nombre;
  }
  const def = EVENT_DEFINITIONS.find((d) => d.tipo_evento === tipo);
  return def?.nombre || tipo || "—";
}

export default async function AuditoriaPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_AUDITORIA"))) {
    return <SinPermiso permiso="PANEL_AUDITORIA" detalle="Tu rol no puede ver el registro de auditoría." />;
  }

  const { movimientos, reversiones } = await cargar();
  // Un lote reabierto queda sin estado operacional: se muestra junto a su anulación.
  const reabiertos = new Set(reversiones.map((r) => r.trazabilidad_id));
  const anulaciones = movimientos.filter((m) => !m.es_correccion).length;
  const correcciones = movimientos.length - anulaciones;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Anulaciones y correcciones de eventos. Nada se borra: cada movimiento queda con su autor y su motivo.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive">
            <Ban className="h-3.5 w-3.5" /> {anulaciones} anulacion{anulaciones === 1 ? "" : "es"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
            <PencilLine className="h-3.5 w-3.5" /> {correcciones} correccion{correcciones === 1 ? "" : "es"}
          </span>
          {reversiones.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> {reversiones.length} lote{reversiones.length === 1 ? "" : "s"} reabierto{reversiones.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {movimientos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Sin movimientos</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Todavía no se anuló ni se corrigió ningún evento.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {movimientos.map((m) => (
            <article key={m.anulacion_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        m.es_correccion ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {m.es_correccion ? <PencilLine className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                      {m.es_correccion ? "Corregido" : "Anulado"}
                    </span>
                    {m.codigo_rgan && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {m.codigo_rgan}
                      </span>
                    )}
                    <span className="text-sm font-medium">{etiquetaEvento(m.tipo_evento, m.codigo_rgan)}</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {m.trazabilidad_id && (
                      <Link
                        href={`/trazabilidad/${m.trazabilidad_id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        🧬 {m.trazabilidad_id}
                      </Link>
                    )}
                    {m.codigo_grano && <span>{GRAIN_NAMES[m.codigo_grano] || m.codigo_grano}</span>}
                    {m.cpe && <span>📄 CP {m.cpe}</span>}
                    {m.evento_fecha && <span>registrado {formatDate(m.evento_fecha)}</span>}
                    {m.responsable_nombre && <span>por {m.responsable_nombre}</span>}
                  </div>

                  {m.motivo && (
                    <p className="mt-2 rounded-md border-l-2 border-border bg-secondary/30 px-3 py-1.5 text-sm">
                      “{m.motivo}”
                    </p>
                  )}

                  {!m.es_correccion && m.trazabilidad_id && reabiertos.has(m.trazabilidad_id) && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-success">
                      <RotateCcw className="h-3.5 w-3.5" />
                      El lote volvió a su estado anterior y puede rehacerse
                    </p>
                  )}
                  {m.es_correccion && m.evento_reemplazo_id && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowRight className="h-3.5 w-3.5" />
                      Reemplazado por un evento nuevo
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right text-xs">
                  <div className="font-medium">{m.actor}</div>
                  {m.actor_rol && <div className="text-muted-foreground">{m.actor_rol}</div>}
                  <div className="mt-0.5 text-muted-foreground">{formatDate(m.anulado_at)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
