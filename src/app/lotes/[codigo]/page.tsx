import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, ShieldCheck, ShieldX, Truck } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { SectionCard } from "@/components/SectionCard";
import { EstadoLoteBadge, EstadoMpBadge } from "@/components/EstadoLoteBadge";
import { EventCompactRow } from "@/components/EventCompactRow";
import { DocumentosCard } from "@/components/DocumentosCard";
import { QrLote } from "@/components/QrLote";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { fichaLote } from "@/lib/lotes";
import { defForEvent, GRAIN_NAMES } from "@/lib/events";
import { estadosFsm } from "@/lib/fsm";
import { cn } from "@/lib/utils";
import { BotonAyuda } from "@/components/Ayuda";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = (n: number | null | undefined, sufijo = "") =>
  n === null || n === undefined ? "—" : `${Number(n).toLocaleString("es-AR")}${sufijo}`;

const fecha = (d: string) => new Date(d).toLocaleDateString("es-AR");

export default async function FichaLotePage({ params }: { params: { codigo: string } }) {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver la ficha del lote." />;
  }

  const codigo = decodeURIComponent(params.codigo);
  const ficha = await fichaLote(codigo);
  if (!ficha.eventos.length && !ficha.liberaciones.length && !ficha.despachos.length) notFound();

  const estados = await estadosFsm();
  const esExcepcion = (e: string | null) => !!estados.find((x) => x.estado === e)?.es_excepcion;

  // URL absoluta para el QR: tiene que servir escaneada desde un teléfono, así
  // que no puede ser relativa.
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const urlFicha = `${proto}://${h.get("host") || "localhost:3000"}/lotes/${encodeURIComponent(codigo)}`;

  const kgProducidos = ficha.resumen?.kg_producidos ?? null;
  const kgDespachados = ficha.despachos.reduce((a, d) => a + Number(d.kg || 0), 0);

  return (
    <div className="space-y-6">
      <Link
        href="/lotes"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Lotes de producción
      </Link>

      {/* Encabezado + QR */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight">{codigo}</h1>
              <BotonAyuda tema="lote" />
              {ficha.resumen && <EstadoLoteBadge estado={ficha.resumen.estado} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {ficha.origenes.map((o) => GRAIN_NAMES[o.codigo_grano] || o.codigo_grano).join(" · ") ||
                "sin grano"}
              {ficha.resumen && ` — abierto el ${fecha(ficha.resumen.abierto_en)}`}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Dato label="Producido" valor={fmt(kgProducidos, " kg")} />
              <Dato label="Unidades" valor={fmt(ficha.resumen?.unidades ?? null)} />
              <Dato label="Despachado" valor={fmt(kgDespachados || null, " kg")} />
              <Dato label="Eventos" valor={String(ficha.eventos.length)} />
            </div>
          </div>

          <div className="flex-shrink-0">
            <QrLote url={urlFicha} />
          </div>
        </div>
      </div>

      {/* Origen en abanico */}
      <SectionCard
        titulo="Origen de la materia prima"
        emoji="🌾"
        contador={ficha.origenes.length}
        subtitulo={
          ficha.origenes.length > 1
            ? "Esta estiba se alimentó de más de un lote de materia prima — la relación es N:N, no una línea recta"
            : "Trazabilidad de origen"
        }
        vacio="Sin trazabilidad de origen registrada."
      >
        <ul className="space-y-2">
          {ficha.origenes.map((o) => (
            <li key={o.trazabilidad_id}>
              <Link
                href={`/trazabilidad/${encodeURIComponent(o.trazabilidad_id)}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold">{o.trazabilidad_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {GRAIN_NAMES[o.codigo_grano] || o.codigo_grano} · {o.codigo_establecimiento} ·
                    campaña {o.campania} · {o.eventos_en_lote}{" "}
                    {o.eventos_en_lote === 1 ? "evento" : "eventos"} en este lote
                  </p>
                </div>
                <EstadoMpBadge
                  estado={o.estado_operacional}
                  esExcepcion={esExcepcion(o.estado_operacional)}
                />
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Liberación */}
      <SectionCard
        titulo="Liberación de producto"
        emoji="🛡"
        contador={ficha.liberaciones.length}
        subtitulo="RGAN-104 — decide si el lote sale a consumo humano"
        vacio="Este lote todavía no fue liberado."
      >
        <div className="space-y-3">
          {ficha.liberaciones.map((l) => (
            <div
              key={l.liberacion_id}
              className={cn(
                "rounded-lg border p-4",
                l.condicion_consumo_humano
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex items-center gap-2">
                {l.condicion_consumo_humano ? (
                  <ShieldCheck className="h-4 w-4 text-success" />
                ) : (
                  <ShieldX className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    l.condicion_consumo_humano ? "text-success" : "text-destructive"
                  )}
                >
                  {l.condicion_consumo_humano ? "APTO para consumo humano" : "NO APTO — bloqueado"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {fecha(l.fecha_liberacion)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Dato label="Cliente" valor={l.cliente_destino || "—"} chico />
                <Dato label="Laboratorio" valor={l.laboratorio || "—"} chico />
                <Dato label="Informe" valor={l.informe_nro || "—"} chico />
                <Dato label="Kg liberados" valor={fmt(l.kg_total)} chico />
              </div>
              {l.lotes_hermanos.length > 0 && (
                <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  Liberado junto con {l.lotes_hermanos.length}{" "}
                  {l.lotes_hermanos.length === 1 ? "lote más" : "lotes más"}:{" "}
                  {l.lotes_hermanos.map((h, i) => (
                    <span key={h}>
                      {i > 0 && ", "}
                      <Link href={`/lotes/${encodeURIComponent(h)}`} className="font-mono text-primary hover:underline">
                        {h}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Despachos */}
      <SectionCard
        titulo="Despachos"
        emoji="🚚"
        contador={ficha.despachos.length}
        subtitulo="RGAN-56 — un lote puede salir en varios remitos (despacho parcial)"
        vacio="Este lote todavía no salió de planta."
      >
        <div className="space-y-3">
          {ficha.despachos.map((d) => (
            <div key={d.despacho_id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold">{d.remito_nro}</span>
                <span className="text-xs text-muted-foreground">{d.cliente_destino}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fecha(d.fecha_despacho)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Dato label="Unidades de este lote" valor={fmt(d.unidades)} chico />
                <Dato label="Kg de este lote" valor={fmt(d.kg)} chico />
                <Dato label="Empaque" valor={d.empaque || "—"} chico />
                <Dato label="Chofer" valor={d.chofer_nombre || "—"} chico />
              </div>
              {d.lugar_entrega && (
                <p className="mt-2 text-[11px] text-muted-foreground">Entrega: {d.lugar_entrega}</p>
              )}
              {d.lotes_hermanos.length > 0 && (
                <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  El remito incluye además: {d.lotes_hermanos.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Timeline */}
      <SectionCard
        titulo="Historia del lote"
        emoji="🕑"
        contador={ficha.eventos.length}
        subtitulo="Todos los eventos que mencionan este lote, en orden"
        vacio="Sin eventos."
      >
        <div className="space-y-1">
          {ficha.eventos.map((e) => {
            const def = defForEvent(e);
            return (
              <div key={e.evento_id}>
                {ficha.origenes.length > 1 && (
                  // Con varios orígenes, saber de qué carta de porte vino cada
                  // evento deja de ser un detalle: es la mitad de la historia.
                  <p className="pl-1 pt-2 font-mono text-[10px] text-muted-foreground">
                    {e.trazabilidad_id}
                  </p>
                )}
                <EventCompactRow
                  evt={{ ...e, datos: e.datos || {} }}
                  def={def}
                  isOK={["OK", "APROBADO"].includes(e.resultado)}
                />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <DocumentosCard
        documentos={ficha.documentos}
        liberaciones={ficha.liberaciones}
        eventos={ficha.eventos}
      />

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Layers className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          <b className="text-foreground">Cómo se arma esta ficha.</b> El lote de producción no es una
          tabla todavía: se reconstruye de los eventos que lo nombran (
          <code className="font-mono">lote_produccion</code> o{" "}
          <code className="font-mono">estiba</code>, según el workflow) y de los puentes de
          liberación y despacho. Por eso el origen puede abrirse en varias trazabilidades: una
          estiba se llena a lo largo de varios días con material de más de una carta de porte.
        </span>
      </p>
    </div>
  );
}

function Dato({ label, valor, chico }: { label: string; valor: string; chico?: boolean }) {
  return (
    <div>
      <p className={cn("text-muted-foreground", chico ? "text-[11px]" : "text-xs")}>{label}</p>
      <p className={cn("font-semibold tabular-nums", chico ? "text-xs" : "text-sm")}>{valor}</p>
    </div>
  );
}
