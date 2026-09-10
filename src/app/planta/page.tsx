import { Sparkles, Wrench, PenLine, AlertTriangle } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { SectionCard } from "@/components/SectionCard";
import { ResultBadge } from "@/components/ResultBadge";
import { EventDataView } from "@/components/EventDataView";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { eventosPlanta } from "@/lib/operacion";
import { formatDate } from "@/lib/utils";
import { BotonAyuda } from "@/components/Ayuda";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const META: Record<string, { titulo: string; rgan: string; icono: typeof Sparkles }> = {
  EV_LIMPIEZA_PLANTA: { titulo: "Limpieza de Planta", rgan: "RGAN-40", icono: Sparkles },
  EV_CHECKLIST_MANTENIMIENTO: { titulo: "Mantenimiento Diario", rgan: "RGAN-80", icono: Wrench },
};

export default async function PlantaPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver los eventos de planta." />;
  }

  const eventos = await eventosPlanta();
  const limpiezas = eventos.filter((e) => e.tipo_evento === "EV_LIMPIEZA_PLANTA");
  const mantenimientos = eventos.filter((e) => e.tipo_evento === "EV_CHECKLIST_MANTENIMIENTO");
  const sinVerificar = eventos.filter((e) => !e.firma_verificacion_id).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            🏭
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Planta</h1>
              <BotonAyuda tema="planta" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Limpieza (RGAN-40) y mantenimiento (RGAN-80) — operaciones de la línea, no de un lote
            </p>
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <b className="text-foreground">Por qué están separados del resto.</b> Estos dos eventos no
        cuelgan de una trazabilidad: la limpieza ocurre <i>entre</i> dos lotes —cuando se registra, el
        lote siguiente todavía no existe— y el mantenimiento cubre la línea entera por turno. Viven
        en <code className="font-mono">traz_eventos_planta</code> (ADR-001) y no suman al progreso de
        ningún lote. La limpieza sí lo condiciona: sin una <b>OK</b> posterior al último ingreso, un
        cambio de grano no puede entrar a proceso (R-PRAN-07).
      </p>

      {sinVerificar > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold">
              {sinVerificar} {sinVerificar === 1 ? "registro sin" : "registros sin"} segunda firma
            </p>
            <p className="text-xs text-muted-foreground">
              Las dos planillas tienen dos renglones de firma (ejecutante y verificador). El bot
              registra sólo la del ejecutante, a propósito: identifica al firmante por su chat, así
              que pedir el PIN dos veces desde el mismo teléfono daría la misma persona firmando dos
              veces y simularía un control cruzado que no existió.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ListaPlanta
          titulo="Limpieza de Planta"
          rgan="RGAN-40"
          emoji="🧹"
          eventos={limpiezas}
          vacio="Sin limpiezas registradas. Se cargan desde el bot al cambiar de grano."
        />
        <ListaPlanta
          titulo="Mantenimiento Diario"
          rgan="RGAN-80"
          emoji="🔧"
          eventos={mantenimientos}
          vacio="Sin checklists de mantenimiento. Se carga uno por turno."
        />
      </div>
    </div>
  );
}

function ListaPlanta({
  titulo,
  rgan,
  emoji,
  eventos,
  vacio,
}: {
  titulo: string;
  rgan: string;
  emoji: string;
  eventos: Awaited<ReturnType<typeof eventosPlanta>>;
  vacio: string;
}) {
  return (
    <SectionCard titulo={titulo} emoji={emoji} subtitulo={rgan} contador={eventos.length} vacio={vacio}>
      <ul className="space-y-3">
        {eventos.map((e) => (
          <li key={e.evento_planta_id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResultBadge resultado={e.resultado} />
              {e.turno && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium">
                  Turno {e.turno}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {e.planta_nombre || e.planta_codigo}
              </span>
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {formatDate(e.fecha)}
              </span>
            </div>

            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <PenLine className="h-3 w-3" />
              {e.responsable}
              {e.verificador_nombre ? (
                <span> · verificado por {e.verificador_nombre}</span>
              ) : (
                <span className="text-warning"> · sin verificar</span>
              )}
            </p>

            <div className="mt-2">
              <EventDataView datos={e.datos} />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
