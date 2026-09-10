import { headers } from "next/headers";
import { Trazabilidad } from "@/lib/types";
import { TrazabilidadesExplorer } from "@/components/TrazabilidadesExplorer";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { BotonAyuda } from "@/components/Ayuda";

// Este listado vivía en `/`. Se movió acá cuando `/` pasó a ser la Torre de
// Control: son dos preguntas distintas — "cómo viene todo" contra "mostrame las
// cartas de porte abiertas".
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTrazabilidades(): Promise<Trazabilidad[]> {
  try {
    const h = headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const res = await fetch(`${proto}://${host}/api/trazabilidades`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" }, // la API exige sesión (middleware)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.trazabilidades || [];
  } catch {
    return [];
  }
}

export default async function TrazabilidadesPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver las trazabilidades." />;
  }

  const trazabilidades = await getTrazabilidades();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
              🌾
            </span>
            <div>
              <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Trazabilidades</h1>
              <BotonAyuda tema="trazabilidades" />
            </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Lotes de materia prima, desde la Carta de Porte
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1">
            <span className="h-2 w-2 animate-pulse-green rounded-full bg-success" />
            <span className="text-xs font-medium text-success">{trazabilidades.length} activas</span>
          </div>
        </div>
      </div>

      <TrazabilidadesExplorer trazabilidades={trazabilidades} />
    </div>
  );
}
