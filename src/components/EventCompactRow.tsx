"use client";

import { useState } from "react";
import { TrazEvento } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ShieldAlert } from "lucide-react";

export function EventCompactRow({ evt, def, isOK }: {
  evt: TrazEvento;
  def?: { nombre: string; rgan: string; icon: string; gate: boolean };
  isOK: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-secondary/20 transition-colors text-left">
        <CheckCircle2 className={cn("h-4 w-4 flex-shrink-0", isOK ? "text-success" : "text-destructive")} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm">{def?.nombre || evt.tipo_evento}</span>
          <span className="text-xs text-muted-foreground font-mono">{def?.rgan}</span>
          {def?.gate && <ShieldAlert className="h-3 w-3 text-amber-400" />}
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(evt.fecha)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-9 mr-2 mb-2 rounded bg-secondary/30 p-3 font-mono text-xs">
          <pre className="whitespace-pre-wrap break-all text-muted-foreground">{JSON.stringify(evt.datos || {}, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
