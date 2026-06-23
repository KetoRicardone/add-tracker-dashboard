import { Trazabilidad } from "@/lib/types";
import { Package, CheckCircle, Activity, Wheat } from "lucide-react";

interface StatsGridProps {
  trazabilidades: Trazabilidad[];
}

export function StatsGrid({ trazabilidades }: StatsGridProps) {
  const total = trazabilidades.length;
  const conEventos = trazabilidades.filter((t) => t.eventos.length > 0).length;
  const eventosHoy = trazabilidades.reduce((sum, t) => {
    const hoy = new Date().toISOString().split("T")[0];
    return sum + t.eventos.filter((e) => e.fecha?.startsWith(hoy)).length;
  }, 0);
  const granosUnicos = new Set(trazabilidades.map((t) => t.codigo_grano)).size;

  const stats = [
    { label: "Trazabilidades activas", value: total, icon: Package, tint: "text-sky-400 bg-sky-500/15" },
    { label: "En proceso", value: conEventos, icon: Activity, tint: "text-amber-400 bg-amber-500/15" },
    { label: "Eventos hoy", value: eventosHoy, icon: CheckCircle, tint: "text-emerald-400 bg-emerald-500/15" },
    { label: "Granos únicos", value: granosUnicos, icon: Wheat, tint: "text-violet-400 bg-violet-500/15" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex items-center justify-between">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tint}`}>
              <stat.icon className="h-4 w-4" />
            </span>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{stat.value}</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
