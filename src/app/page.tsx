import { Trazabilidad } from "@/lib/types";
import { TrazabilidadCard } from "@/components/TrazabilidadCard";
import { StatsGrid } from "@/components/StatsGrid";
import { LoginRequired } from "@/components/LoginRequired";
import { getSesion } from "@/lib/auth";
import { RefreshCw, Filter } from "lucide-react";

import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTrazabilidades(): Promise<Trazabilidad[]> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/trazabilidades`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.trazabilidades || [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  if (!getSesion()) return <LoginRequired />;

  const trazabilidades = await getTrazabilidades();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">🌾</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Trazabilidad operacional de granos — Anta del Dorado S.A.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-green" />
            <span className="text-xs font-medium text-success">{trazabilidades.length} activas</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsGrid trazabilidades={trazabilidades} />

      {/* Trazabilidades */}
      {trazabilidades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Sin trazabilidades activas</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            No hay trazabilidades en estado ABIERTA. Creá una nueva trazabilidad desde el bot de Telegram para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trazabilidades.map((traz) => (
            <TrazabilidadCard key={traz.trazabilidad_id} traz={traz} />
          ))}
        </div>
      )}

      {/* Pipeline legend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Pipeline de eventos — Etapa 1</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { fase: "F1 · Recepción", items: "OCR · RGAN-38 (P1+P2) · RGAN-39 · RGAN-55", color: "bg-emerald-500" },
            { fase: "F2 · Procesamiento", items: "RGAN-41 · RGAN-53 · RGAN-61 · RGAN-60", color: "bg-blue-500" },
            { fase: "F3 · Embolsado + PCC", items: "RGAN-57 · RGAN-42 · RGAN-81 · RGAN-43 · RGAN-104", color: "bg-amber-500" },
            { fase: "F4 · Despacho", items: "RGAN-56 · RGAN-74 · RGAN-21", color: "bg-violet-500" },
          ].map((f) => (
            <div key={f.fase} className="flex items-start gap-2">
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${f.color}`} />
              <div>
                <p className="font-medium">{f.fase}</p>
                <p className="text-muted-foreground">{f.items}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
