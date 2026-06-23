import { Trazabilidad, TrazEvento } from "@/lib/types";
import { EventTimeline } from "@/components/EventTimeline";
import { GrainIcon, GrainBadge } from "@/components/GrainIcon";
import { ProgressBar } from "@/components/ProgressBar";
import { EVENT_DEFINITIONS } from "@/lib/events";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Calendar, MapPin, Hash } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

async function getTrazabilidad(id: string): Promise<Trazabilidad | null> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/trazabilidad/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function TrazabilidadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const traz = await getTrazabilidad(params.id);

  if (!traz) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Trazabilidad no encontrada</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {params.id} no existe o no está disponible.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  const tiposRegistrados = new Set(traz.eventos.map((e) => e.tipo_evento));
  const completados = EVENT_DEFINITIONS.filter((d) => tiposRegistrados.has(d.tipo_evento)).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <GrainIcon codigo={traz.codigo_grano} size="lg" />
          <div className="flex-1">
            <h1 className="font-mono text-xl font-bold tracking-tight">
              {traz.trazabilidad_id}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <GrainBadge codigo={traz.codigo_grano} />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {traz.codigo_establecimiento}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Campaña {traz.campania}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {traz.estado_operacional || traz.estado_trazabilidad}
              </span>
            </div>
            <div className="mt-4 max-w-md">
              <ProgressBar
                completados={completados}
                total={EVENT_DEFINITIONS.length}
                tiposRegistrados={tiposRegistrados}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-6">Línea de tiempo</h2>
        <EventTimeline eventos={traz.eventos} />
      </div>
    </div>
  );
}
