import { Trazabilidad, TrazEvento } from "@/lib/types";
import { GRAIN_NAMES } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { CPCard } from "@/components/CPCard";
import { ArrowLeft, Calendar, MapPin, Hash } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTrazabilidad(id: string): Promise<Trazabilidad | null> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/trazabilidad/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function getCPE(evt: TrazEvento): string | null {
  const d = evt.datos || {};
  return (d.cpe as string) || (d.cp_seleccionada as string) || null;
}

function groupByCPE(eventos: TrazEvento[]): Map<string, TrazEvento[]> {
  const groups = new Map<string, TrazEvento[]>();
  eventos.forEach((evt) => {
    const cpe = getCPE(evt);
    if (cpe) {
      const arr = groups.get(cpe) || [];
      arr.push(evt);
      groups.set(cpe, arr);
    }
  });
  return groups;
}

export default async function TrazabilidadDetailPage({ params }: { params: { id: string } }) {
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
  const totalDefs = 16;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Dashboard</Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🌾</div>
          <div className="flex-1">
            <h1 className="font-mono text-xl font-bold tracking-tight">{traz.trazabilidad_id}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm font-medium">{GRAIN_NAMES[traz.codigo_grano] || traz.codigo_grano}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{traz.codigo_establecimiento}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{traz.campania}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Hash className="h-3 w-3" />{traz.estado_trazabilidad}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{cpGroups.size} CPs · {traz.eventos.length} eventos · Creada {formatDate(traz.fecha_apertura)}</p>
          </div>
        </div>
      </div>

      {cpGroups.size === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-10 text-center text-muted-foreground text-sm">Sin Cartas de Porte registradas</div>
      ) : (
        Array.from(cpGroups.entries()).map(([cpe, evts]) => {
          const ocrEvt = evts.find((e) => e.tipo_evento === "EV_OCR_CARTA_PORTE");
          const doneCount = new Set(evts.map((e) => e.tipo_evento)).size;
          return <CPCard key={cpe} cpe={cpe} evts={evts} ocrEvt={ocrEvt} doneCount={doneCount} totalDefs={totalDefs} />;
        })
      )}
    </div>
  );
}
