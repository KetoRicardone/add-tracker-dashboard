import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { KpiTile } from "@/components/KpiTile";
import { SectionCard } from "@/components/SectionCard";
import { EstadoMpBadge } from "@/components/EstadoLoteBadge";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { kpis, alertas, ultimosMovimientos } from "@/lib/torre";
import { estadosFsm, conteoPorEstado } from "@/lib/fsm";
import { listarLotes } from "@/lib/lotes";
import { LoteCard } from "@/components/LoteCard";
import { EVENT_DEFINITIONS } from "@/lib/events";
import { cn } from "@/lib/utils";
import { BotonAyuda } from "@/components/Ayuda";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const nombreEvento = (tipo: string) =>
  EVENT_DEFINITIONS.find((d) => d.tipo_evento === tipo)?.nombre || tipo.replace(/^EV_/, "").replace(/_/g, " ");

export default async function TorreDeControlPage() {
  const sesion = getSesion();
  if (!sesion) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver la torre de control." />;
  }

  // Todo en paralelo: son consultas independientes contra la misma base.
  const [k, avisos, movimientos, estados, porEstado, lotes] = await Promise.all([
    kpis(),
    alertas(),
    ultimosMovimientos(10),
    estadosFsm(),
    conteoPorEstado(),
    listarLotes(6),
  ]);

  const totalEnPipeline = Array.from(porEstado.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            🗼
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Torre de control</h1>
              <BotonAyuda tema="torre" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Anta del Dorado S.A. — la carga se hace en el bot; acá se consulta y se audita
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiTile
          label="Trazabilidades abiertas"
          valor={k.trazabilidades_abiertas}
          icono="🌾"
          href="/trazabilidades"
          nota="Lotes de materia prima sin cerrar"
        />
        <KpiTile
          label="Lotes de producción"
          valor={k.lotes_produccion}
          icono="📦"
          href="/lotes"
          nota="Estibas con al menos un evento"
        />
        <KpiTile label="Eventos hoy" valor={k.eventos_hoy} icono="⚡" nota={`${k.eventos_semana} en 7 días`} href="/eventos" />
        <KpiTile
          label="Kg despachados"
          valor={k.kg_despachados.toLocaleString("es-AR")}
          icono="🚚"
          href="/despachos"
          nota="Suma de remitos registrados"
        />
        <KpiTile
          label="Liberaciones"
          valor={k.liberaciones}
          icono="🛡"
          href="/liberaciones"
          tono={k.bloqueados > 0 ? "alerta" : "normal"}
          nota={k.bloqueados > 0 ? `${k.bloqueados} marcadas NO APTO` : "RGAN-104"}
        />
      </div>

      {/* Alertas */}
      {avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.map((a, i) => (
            <Link
              key={i}
              href={a.href || "#"}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                a.nivel === "alta"
                  ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                  : "border-warning/30 bg-warning/5 hover:border-warning/50"
              )}
            >
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-4 w-4 flex-shrink-0",
                  a.nivel === "alta" ? "text-destructive" : "text-warning"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{a.titulo}</p>
                <p className="text-xs text-muted-foreground">{a.detalle}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pipeline por estado de la FSM */}
      <SectionCard
        titulo="Pipeline de materia prima"
        emoji="🔄"
        subtitulo="Estados de fsm_estado_def, con la cantidad de lotes en cada uno"
        contador={totalEnPipeline}
        vacio="Todavía no hay lotes en circulación. Van a aparecer acá en cuanto se cargue la primera Carta de Porte."
      >
        <div className="flex flex-wrap gap-2">
          {estados.map((e) => {
            const n = porEstado.get(e.estado) || 0;
            return (
              <div
                key={e.estado}
                title={e.descripcion || undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2",
                  n === 0 && "opacity-40",
                  e.es_excepcion
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-background"
                )}
              >
                <span className="text-xs font-medium">{e.estado.replace(/_/g, " ")}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold tabular-nums",
                    e.es_excepcion ? "bg-destructive/15 text-destructive" : "bg-secondary"
                  )}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Últimos lotes de producción */}
        <SectionCard
          titulo="Lotes de producción recientes"
          emoji="📦"
          contador={lotes.length}
          subtitulo="Estibas armadas por RGAN-53 en adelante"
          vacio="Ningún lote de producción todavía. El primero nace cuando RGAN-53 abre una estiba."
        >
          <div className="space-y-3">
            {lotes.map((l) => (
              <LoteCard key={l.lote} lote={l} />
            ))}
            {lotes.length > 0 && (
              <Link
                href="/lotes"
                className="flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                Ver todos los lotes <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </SectionCard>

        {/* Últimos movimientos */}
        <SectionCard
          titulo="Últimos movimientos"
          emoji="⚡"
          contador={movimientos.length}
          subtitulo="Eventos de lote y de planta, mezclados por fecha"
          vacio="Sin actividad registrada."
        >
          <ul className="divide-y divide-border">
            {movimientos.map((m) => (
              <li key={m.evento_id} className="flex items-start justify-between gap-3 py-2 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{nombreEvento(m.tipo_evento)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.responsable || "sin responsable"}
                    {m.ambito === "PLANTA" ? (
                      <span className="ml-1.5 rounded bg-secondary px-1 text-[10px] font-medium">
                        PLANTA
                      </span>
                    ) : m.lote ? (
                      <span className="ml-1.5 font-mono text-[11px]">{m.lote}</span>
                    ) : m.trazabilidad_id ? (
                      <span className="ml-1.5 font-mono text-[11px]">{m.trazabilidad_id}</span>
                    ) : null}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {new Date(m.fecha).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Estado operacional: leyenda breve */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Cómo leer esto.</span> La carga la hace el bot
        de Telegram en planta; el panel es de consulta y auditoría. Los estados salen de{" "}
        <code className="font-mono">fsm_estado_def</code> y los lotes de producción se derivan de los
        eventos ya registrados — el panel no inventa ni recalcula nada que después se guarde.
        <span className="ml-1 inline-flex items-center gap-1">
          <EstadoMpBadge estado="RETENIDA" esExcepcion /> y los demás estados en rojo son excepciones
          del circuito.
        </span>
      </div>
    </div>
  );
}
