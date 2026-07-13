"use client";

import { useMemo, useState } from "react";
import { Trazabilidad } from "@/lib/types";
import { TrazabilidadCard } from "./TrazabilidadCard";
import { GRAIN_NAMES } from "@/lib/events";
import { cn } from "@/lib/utils";
import { Package, Activity, CalendarCheck, Wheat, Search, X, Filter } from "lucide-react";

type Filtro = "activas" | "proceso" | "hoy";

// Stats clickeables que filtran el listado + buscador de texto.
// Por defecto se muestran las activas (todo lo que devuelve la API).
export function TrazabilidadesExplorer({ trazabilidades }: { trazabilidades: Trazabilidad[] }) {
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [grano, setGrano] = useState<string | null>(null);
  const [granosOpen, setGranosOpen] = useState(false);
  const [q, setQ] = useState("");

  const hoy = new Date().toISOString().split("T")[0];

  const enProceso = useMemo(
    () => trazabilidades.filter((t) => t.estado_operacional === "EN_PROCESAMIENTO"),
    [trazabilidades]
  );
  const conEventosHoy = useMemo(
    () => trazabilidades.filter((t) => t.eventos.some((e) => e.fecha?.startsWith(hoy))),
    [trazabilidades, hoy]
  );
  const eventosHoy = useMemo(
    () => trazabilidades.reduce((s, t) => s + t.eventos.filter((e) => e.fecha?.startsWith(hoy)).length, 0),
    [trazabilidades, hoy]
  );
  const granos = useMemo(() => {
    const m = new Map<string, number>();
    trazabilidades.forEach((t) => m.set(t.codigo_grano, (m.get(t.codigo_grano) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [trazabilidades]);

  const filtradas = useMemo(() => {
    let list = trazabilidades;
    if (filtro === "proceso") list = list.filter((t) => t.estado_operacional === "EN_PROCESAMIENTO");
    if (filtro === "hoy") list = list.filter((t) => t.eventos.some((e) => e.fecha?.startsWith(hoy)));
    if (grano) list = list.filter((t) => t.codigo_grano === grano);
    const n = q.trim().toLowerCase();
    if (n) {
      list = list.filter(
        (t) =>
          t.trazabilidad_id.toLowerCase().includes(n) ||
          (t.codigo_grano || "").toLowerCase().includes(n) ||
          (GRAIN_NAMES[t.codigo_grano] || "").toLowerCase().includes(n) ||
          (t.codigo_establecimiento || "").toLowerCase().includes(n) ||
          String(t.campania || "").toLowerCase().includes(n) ||
          t.eventos.some((e) => {
            const d = (e.datos || {}) as Record<string, unknown>;
            const cp = String(d.cpe || d.cp_seleccionada || "");
            return cp.toLowerCase().includes(n);
          })
      );
    }
    return list;
  }, [trazabilidades, filtro, grano, q, hoy]);

  const hayFiltros = filtro !== "activas" || grano !== null || q.trim() !== "";
  const limpiar = () => {
    setFiltro("activas");
    setGrano(null);
    setGranosOpen(false);
    setQ("");
  };

  const tiles: {
    id: string;
    label: string;
    value: number;
    icon: typeof Package;
    tint: string;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      id: "activas",
      label: "Trazabilidades activas",
      value: trazabilidades.length,
      icon: Package,
      tint: "text-sky-600 bg-sky-500/15",
      active: filtro === "activas" && !grano,
      onClick: () => { setFiltro("activas"); setGrano(null); setGranosOpen(false); },
    },
    {
      id: "proceso",
      label: "En proceso",
      value: enProceso.length,
      icon: Activity,
      tint: "text-amber-600 bg-amber-500/15",
      active: filtro === "proceso",
      onClick: () => setFiltro(filtro === "proceso" ? "activas" : "proceso"),
    },
    {
      id: "hoy",
      label: `Eventos hoy (${conEventosHoy.length} traz.)`,
      value: eventosHoy,
      icon: CalendarCheck,
      tint: "text-emerald-600 bg-emerald-500/15",
      active: filtro === "hoy",
      onClick: () => setFiltro(filtro === "hoy" ? "activas" : "hoy"),
    },
    {
      id: "granos",
      label: grano ? `Grano: ${GRAIN_NAMES[grano] || grano}` : "Granos únicos",
      value: grano ? (granos.find(([g]) => g === grano)?.[1] ?? 0) : granos.length,
      icon: Wheat,
      tint: "text-violet-600 bg-violet-500/15",
      active: grano !== null || granosOpen,
      onClick: () => {
        if (grano) { setGrano(null); setGranosOpen(false); }
        else setGranosOpen(!granosOpen);
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tiles-filtro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <button
            key={t.id}
            onClick={t.onClick}
            className={cn(
              "group rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
              t.active ? "border-primary ring-1 ring-primary bg-accent/40" : "border-border"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", t.tint)}>
                <t.icon className="h-4 w-4" />
              </span>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{t.value}</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <span
                className={cn(
                  "hidden sm:inline text-[10px] font-medium transition-opacity",
                  t.active ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                )}
              >
                {t.active ? "✓ filtrando" : "filtrar"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selector de grano */}
      {granosOpen && !grano && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-xs text-muted-foreground mr-1">Filtrar por grano:</span>
          {granos.map(([g, count]) => (
            <button
              key={g}
              onClick={() => { setGrano(g); setGranosOpen(false); }}
              className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
            >
              {GRAIN_NAMES[g] || g} <span className="text-muted-foreground">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, N° de CP, grano, establecimiento o campaña…"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {filtradas.length} de {trazabilidades.length}
          </span>
          {hayFiltros && (
            <button onClick={limpiar} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium hover:border-primary hover:text-primary transition-colors">
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-secondary p-4 mb-4">
            <Filter className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">
            {trazabilidades.length === 0 ? "Sin trazabilidades activas" : "Sin resultados"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {trazabilidades.length === 0
              ? "No hay trazabilidades en estado ABIERTA. Creá una nueva trazabilidad desde el bot de Telegram para comenzar."
              : "Ninguna trazabilidad coincide con los filtros o la búsqueda."}
          </p>
          {hayFiltros && (
            <button onClick={limpiar} className="mt-3 text-sm font-medium text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((traz) => (
            <TrazabilidadCard key={traz.trazabilidad_id} traz={traz} />
          ))}
        </div>
      )}
    </div>
  );
}
