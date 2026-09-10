"use client";

import { useState } from "react";
import { Firma, TrazEvento } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import { firmaEventoLabel } from "@/lib/eventMeta";
import { defForEvent } from "@/lib/events";
import { eventoPorFirma, firmasSinVinculo } from "@/lib/firmas";
import { Link2, PenLine, ShieldCheck, ChevronDown } from "lucide-react";

export function FirmasCard({ firmas, eventos = [] }: { firmas: Firma[]; eventos?: TrazEvento[] }) {
  const [open, setOpen] = useState(false); // comprimida por defecto
  // Con firma_auditoria_id se sabe el evento exacto que cerró cada firma; sin
  // él sólo queda el tipo, que se repite (hay un RGAN-53 por turno).
  const porFirma = eventoPorFirma(eventos);
  const sinVinculo = firmasSinVinculo(eventos, firmas || []).length;
  if (!firmas || firmas.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-5 py-3 text-left bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/15 transition-colors",
          open && "border-b border-border"
        )}
      >
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Firmas y aprobaciones</h3>
        <span className="ml-auto text-xs text-muted-foreground">{firmas.length}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>

      {open && (
        <div className="divide-y divide-border/40">
          {sinVinculo > 0 && (
            <p className="px-5 py-2 text-[11px] text-muted-foreground bg-secondary/30">
              {sinVinculo === 1
                ? "1 firma sin vínculo al evento que cerró"
                : `${sinVinculo} firmas sin vínculo al evento que cerraron`}
              {" "}— registradas antes de que el bot guardara la referencia. Se listan
              igual, pero no se le atribuyen a ningún paso para no arriesgar un dato falso.
            </p>
          )}
          {firmas.map((f, i) => {
            const evt = f.auditoria_id ? porFirma.get(f.auditoria_id) : undefined;
            const def = evt ? defForEvent(evt) : undefined;
            return (
              <div key={f.auditoria_id || i} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <PenLine className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.firmante}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                    {evt && <Link2 className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />}
                    <span className="truncate">
                      Firmó · {def ? `${def.rgan} — ${def.nombre}` : firmaEventoLabel(f.evento_tipo)}
                    </span>
                  </p>
                </div>
                <span
                  className="text-[11px] text-muted-foreground whitespace-nowrap"
                  title={evt ? "Vinculada al evento del " + formatDate(evt.fecha) : "Sin vínculo explícito al evento"}
                >
                  {formatDate(f.fecha)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
