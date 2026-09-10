import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";
import { EstadoLoteBadge } from "./EstadoLoteBadge";
import { GRAIN_NAMES } from "@/lib/events";
import type { LoteResumen } from "@/lib/lotes";

const fmt = (n: number | null, sufijo = "") =>
  n === null || n === undefined ? "—" : `${n.toLocaleString("es-AR")}${sufijo}`;

export function LoteCard({ lote }: { lote: LoteResumen }) {
  return (
    <Link
      href={`/lotes/${encodeURIComponent(lote.lote)}`}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-bold tracking-tight">{lote.lote}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lote.granos.map((g) => GRAIN_NAMES[g] || g).join(" · ") || "sin grano"}
          </p>
        </div>
        <EstadoLoteBadge estado={lote.estado} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Producido</p>
          <p className="font-semibold tabular-nums">{fmt(lote.kg_producidos, " kg")}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Unidades</p>
          <p className="font-semibold tabular-nums">{fmt(lote.unidades)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Eventos</p>
          <p className="font-semibold tabular-nums">{lote.eventos}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        {/* El origen en abanico es la parte que no se puede simplificar: una
            estiba se llena con material de varias cartas de porte. */}
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          {lote.origenes === 1
            ? lote.trazabilidades[0]
            : `${lote.origenes} lotes de materia prima`}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </Link>
  );
}
