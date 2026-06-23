import { Firma } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { firmaEventoLabel } from "@/lib/eventMeta";
import { PenLine, ShieldCheck } from "lucide-react";

export function FirmasCard({ firmas }: { firmas: Firma[] }) {
  if (!firmas || firmas.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Firmas y aprobaciones</h3>
        <span className="ml-auto text-xs text-muted-foreground">{firmas.length}</span>
      </div>
      <div className="divide-y divide-border/40">
        {firmas.map((f, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PenLine className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.firmante}</p>
              <p className="text-xs text-muted-foreground truncate">Firmó · {firmaEventoLabel(f.evento_tipo)}</p>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(f.fecha)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
