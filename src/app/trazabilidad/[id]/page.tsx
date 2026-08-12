import { Trazabilidad, TrazEvento } from "@/lib/types";
import { EVENT_DEFINITIONS, GRAIN_NAMES, stepKeyForEvent } from "@/lib/events";
import { formatDate, cn } from "@/lib/utils";
import { CPCard } from "@/components/CPCard";
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
 * Agrupa eventos por Carta de Porte. Los eventos sin CPE (ej. Calidad MP que
 * no propagó el campo) NO se descartan: si hay una sola CP, se adjuntan a ella;
 * si hay varias, van a un grupo "Sin CP asignada" para que siempre se vean.
 */
function groupByCPE(eventos: TrazEvento[]): Map<string, TrazEvento[]> {
  const cpes = Array.from(
    new Set(eventos.map(getCPE).filter((c): c is string => !!c))
  );
  const soleCPE = cpes.length === 1 ? cpes[0] : null;

  const groups = new Map<string, TrazEvento[]>();
  cpes.forEach((c) => groups.set(c, [])); // preserva el orden de aparición

  eventos.forEach((evt) => {
    const key = getCPE(evt) || soleCPE || SIN_CP;
    const arr = groups.get(key) || [];
    arr.push(evt);
    groups.set(key, arr);
  });
  return groups;
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

  const cpGroups = groupByCPE(traz.eventos);
  const totalDefs = EVENT_DEFINITIONS.length;

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

      {cpGroups.size === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-10 text-center text-muted-foreground text-sm">Sin Cartas de Porte registradas</div>
      ) : (
        Array.from(cpGroups.entries()).map(([cpe, evts]) => {
          const ocrEvt = evts.find((e) => e.tipo_evento === "EV_OCR_CARTA_PORTE");
          const doneCount = new Set(evts.map(stepKeyForEvent)).size;
          return <CPCard key={cpe} cpe={cpe} evts={evts} ocrEvt={ocrEvt} doneCount={doneCount} totalDefs={totalDefs} firmas={traz.firmas || []} trazabilidadId={traz.trazabilidad_id} canEdit={!!sesion} actorNombre={sesion?.nombre || ""} humedadMaxGrano={traz.humedad_pct_max ?? null} />;
        })
      )}
    </div>
  );
}
