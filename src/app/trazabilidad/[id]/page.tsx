import { Trazabilidad, TrazEvento, ConsumoCP } from "@/lib/types";
import { GRAIN_NAMES, defsForFase, faseForEvent } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { CPCard } from "@/components/CPCard";
import { FaseCard } from "@/components/FaseCard";
import { FirmasCard } from "@/components/FirmasCard";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { puede } from "@/lib/permisos";
import { ArrowLeft, Calendar, MapPin, FileText, Layers } from "lucide-react";
import { headers } from "next/headers";
import { getSesion } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTrazabilidad(id: string): Promise<Trazabilidad | null> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/trazabilidad/${id}`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" }, // la API exige sesión (middleware)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function getCPE(evt: TrazEvento): string | null {
  const d = evt.datos || {};
  return (d.cpe as string) || (d.cp_seleccionada as string) || null;
}

const SIN_CP = "__sin_cp__";

/**
 * Clave de agrupación de un evento de recepción. Los eventos sin CPE (ej. Calidad
 * MP que no propagó el campo) NO se descartan: si hay una sola CP se adjuntan a
 * ella, y si hay varias van a "Sin CP asignada" para que siempre se vean.
 */
function claveCP(evt: TrazEvento, soleCPE: string | null): string {
  return getCPE(evt) || soleCPE || SIN_CP;
}

/** Agrupa por Carta de Porte. Recibe SOLO eventos de recepción (Fase 1). */
function groupByCPE(eventos: TrazEvento[], soleCPE: string | null): Map<string, TrazEvento[]> {
  const groups = new Map<string, TrazEvento[]>();
  // Preserva el orden de aparición de las CPs.
  eventos.forEach((evt) => {
    const cpe = getCPE(evt);
    if (cpe && !groups.has(cpe)) groups.set(cpe, []);
  });

  eventos.forEach((evt) => {
    const key = claveCP(evt, soleCPE);
    const arr = groups.get(key) || [];
    arr.push(evt);
    groups.set(key, arr);
  });
  return groups;
}

function precintosDe(evt: TrazEvento): Record<string, unknown>[] {
  const p = (evt.datos || {}).precintos;
  return Array.isArray(p) ? (p as Record<string, unknown>[]) : [];
}

/**
 * Cuántos big bags de cada CP ya entraron a la línea de proceso.
 * Se cruza por NÚMERO DE PRECINTO, no por el `cpe` del evento de proceso: el
 * número es el dato duro y el cpe de ese evento es derivado. La API ya excluye
 * eventos anulados, así que anular un ingreso libera los big bags solo.
 */
function calcularConsumo(eventos: TrazEvento[], soleCPE: string | null): Map<string, ConsumoCP> {
  const yaEnProceso = new Set<string>();
  eventos
    .filter((e) => e.tipo_evento === "EV_INGRESO_A_PROCESO")
    .forEach((e) => precintosDe(e).forEach((p) => {
      if (typeof p.nro === "string" && p.nro) yaEnProceso.add(p.nro);
    }));

  const porCP = new Map<string, ConsumoCP>();
  eventos
    .filter((e) => e.tipo_evento === "EV_INGRESO_MP_DETALLE")
    .forEach((e) => {
      const key = claveCP(e, soleCPE);
      const acc = porCP.get(key) || { recibidos: 0, enProceso: 0, kgRecibidos: 0, kgEnProceso: 0 };
      precintosDe(e).forEach((p) => {
        const nro = typeof p.nro === "string" ? p.nro : "";
        const peso = typeof p.peso === "number" ? p.peso : 0;
        acc.recibidos += 1;
        acc.kgRecibidos += peso;
        if (nro && yaEnProceso.has(nro)) {
          acc.enProceso += 1;
          acc.kgEnProceso += peso;
        }
      });
      porCP.set(key, acc);
    });
  return porCP;
}

function TituloSeccion({ children, nota }: { children: React.ReactNode; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap px-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>
      {nota && <span className="text-[11px] text-muted-foreground/70">{nota}</span>}
    </div>
  );
}

export default async function TrazabilidadDetailPage({ params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver las trazabilidades." />;
  }
  const traz = await getTrazabilidad(params.id);
  if (!traz) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Trazabilidad no encontrada</h2>
        <Link href="/" className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Volver</Link>
      </div>
    );
  }

  // La Carta de Porte gobierna la recepción. Desde el ingreso a proceso la línea
  // se arma por establecimiento y grano, y el control de proceso es del turno:
  // esos eventos no pertenecen a ninguna CP y se muestran a nivel lote.
  const eventosRecepcion = traz.eventos.filter((e) => faseForEvent(e) === 1);
  const eventosProceso = traz.eventos.filter((e) => faseForEvent(e) === 2);
  const eventosSalida = traz.eventos.filter((e) => faseForEvent(e) >= 3);

  const cpes = Array.from(new Set(eventosRecepcion.map(getCPE).filter((c): c is string => !!c)));
  const soleCPE = cpes.length === 1 ? cpes[0] : null;
  const cpGroups = groupByCPE(eventosRecepcion, soleCPE);
  const consumoPorCP = calcularConsumo(traz.eventos, soleCPE);

  const defsRecepcion = defsForFase([1]);
  const defsProceso = defsForFase([2]);
  const defsSalida = defsForFase([3, 4]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Panel de control</Link>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15 text-3xl">🌾</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-xl font-bold tracking-tight">{traz.trazabilidad_id}</h1>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border",
                traz.estado_trazabilidad === "ABIERTA"
                  ? "bg-success/15 text-success border-success/30"
                  : "bg-secondary text-muted-foreground border-border"
              )}>
                {traz.estado_trazabilidad}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm font-medium">{GRAIN_NAMES[traz.codigo_grano] || traz.codigo_grano}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{traz.codigo_establecimiento}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{traz.campania}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{cpGroups.size} CPs</span>
              <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{traz.eventos.length} eventos</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(traz.fecha_apertura)}</span>
            </div>
          </div>
        </div>
      </div>

      <FirmasCard firmas={traz.firmas || []} />

      <section className="space-y-3">
        <TituloSeccion nota={`${defsRecepcion.length} pasos por CP`}>Recepción — por Carta de Porte</TituloSeccion>
        {cpGroups.size === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-10 text-center text-muted-foreground text-sm">Sin Cartas de Porte registradas</div>
        ) : (
          Array.from(cpGroups.entries()).map(([cpe, evts]) => {
            const ocrEvt = evts.find((e) => e.tipo_evento === "EV_OCR_CARTA_PORTE");
            return (
              <CPCard
                key={cpe}
                cpe={cpe}
                evts={evts}
                ocrEvt={ocrEvt}
                defs={defsRecepcion}
                consumo={consumoPorCP.get(cpe)}
                firmas={traz.firmas || []}
                trazabilidadId={traz.trazabilidad_id}
                canEdit={!!sesion}
                actorNombre={sesion?.nombre || ""}
                humedadMaxGrano={traz.humedad_pct_max ?? null}
              />
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <TituloSeccion nota="no pertenece a una CP">Procesamiento y salida — por lote</TituloSeccion>
        <FaseCard
          titulo="Procesos"
          subtitulo="Ingreso a la línea, control de proceso y caídas"
          variante="proceso"
          evts={eventosProceso}
          defs={defsProceso}
          firmas={traz.firmas || []}
          canEdit={!!sesion}
          actorNombre={sesion?.nombre || ""}
          humedadMaxGrano={traz.humedad_pct_max ?? null}
        />
        <FaseCard
          titulo="Embolsado y salida"
          subtitulo="Envasado, PCC, liberación y despacho"
          variante="salida"
          evts={eventosSalida}
          defs={defsSalida}
          firmas={traz.firmas || []}
          canEdit={!!sesion}
          actorNombre={sesion?.nombre || ""}
          humedadMaxGrano={traz.humedad_pct_max ?? null}
        />
      </section>
    </div>
  );
}
