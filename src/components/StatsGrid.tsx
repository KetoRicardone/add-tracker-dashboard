import { Trazabilidad } from "@/lib/types";
import { GRAIN_NAMES } from "@/lib/events";
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
    { label: "Trazabilidades activas", value: total, icon: Package, color: "text-blue-400" },
    { label: "En proceso", value: conEventos, icon: Activity, color: "text-amber-400" },
    { label: "Eventos hoy", value: eventosHoy, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Granos únicos", value: granosUnicos, icon: Wheat, color: "text-violet-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
