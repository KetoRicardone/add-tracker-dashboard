import { cn } from "@/lib/utils";
import {
  humanizeKey, formatScalar, isChecklistMap, type ChecklistValue,
  limiteHumedadValido, estadoHumedad, TOLERANCIA_HUMEDAD,
} from "@/lib/eventMeta";
import { Check, X, AlertTriangle, Minus } from "lucide-react";

// Claves que se muestran en otro lado (observaciones) o son ruido visual.
const SKIP_KEYS = new Set([
  "observaciones",
  "observacion",
  "observaciones_finales",
  "fecha",
  "checklist_index",
  "checklist_respuestas_meta",
  "humedad_pct_max", // umbral interno de especificación, no dato operativo
  "codigo_rgan", // ya se muestra como badge en el encabezado del evento
]);

// Valores basura que no deben mostrarse (grano/CP sin cargar dejan "null" string).
const JUNK_VALUES = new Set(["null", "undefined", "NaN", "-"]);
function isJunk(v: unknown): boolean {
  return typeof v === "string" && JUNK_VALUES.has(v.trim().toLowerCase());
}

// Boolean maps donde `true` es una alerta (no un "OK").
const FLAG_WHEN_TRUE = new Set(["respuestas_contaminacion"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function BooleanItem({ label, value, flagWhenTrue }: { label: string; value: ChecklistValue; flagWhenTrue: boolean }) {
  // Tri-estado: SI (true) / NO (false) / No aplica ('NA').
  if (value === "NA") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5">
        <Minus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs flex-1 min-w-0 truncate">{label}</span>
        <span className="text-[10px] font-semibold text-muted-foreground">No aplica</span>
      </div>
    );
  }
  const isAlert = flagWhenTrue ? value : !value;
  return (
    <div className="flex items-center gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5">
      {flagWhenTrue ? (
        value ? <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" /> : <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
      ) : value ? (
        <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
      )}
      <span className="text-xs flex-1 min-w-0 truncate">{label}</span>
      <span className={cn("text-[10px] font-semibold", isAlert ? "text-warning" : "text-muted-foreground")}>
        {value ? "Sí" : "No"}
      </span>
    </div>
  );
}

function ChecklistBlock({ title, obj, flagWhenTrue }: { title: string; obj: Record<string, ChecklistValue>; flagWhenTrue: boolean }) {
  const entries = Object.entries(obj);
  const okCount = entries.filter(([, v]) => v !== "NA" && (flagWhenTrue ? !v : v)).length;
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground/80">{title}</span>
        <span className="text-[10px] text-muted-foreground">{okCount}/{entries.length} OK</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {entries.map(([k, v]) => (
          <BooleanItem key={k} label={humanizeKey(k)} value={v} flagWhenTrue={flagWhenTrue} />
        ))}
      </div>
    </div>
  );
}

function ScalarGrid({ items, limiteHumedad }: { items: [string, unknown][]; limiteHumedad: number | null }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(([k, v]) => {
        if (k === "humedad_pct") return <HumedadTile key={k} valor={v} limite={limiteHumedad} />;
        return (
          <div key={k} className="rounded-md bg-secondary/40 px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground truncate">{humanizeKey(k)}</p>
            <p className="text-sm font-medium truncate">{formatScalar(k, v)}</p>
          </div>
        );
      })}
    </div>
  );
}

/** La humedad se lee contra el límite del grano: pasado el máximo + 2 el lote
 *  se rechaza (R-PRAN-02), así que se resalta en rojo. */
function HumedadTile({ valor, limite }: { valor: unknown; limite: number | null }) {
  const estado = estadoHumedad(valor, limite);
  const rechazo = estado === "rechazo";
  const excedido = estado === "excedido";
  return (
    <div
      className={cn(
        "rounded-md px-2.5 py-1.5",
        rechazo ? "bg-destructive/15 ring-1 ring-destructive/40" : excedido ? "bg-warning/15" : "bg-secondary/40"
      )}
    >
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
        Humedad
        {rechazo && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
      </p>
      <p className={cn("text-sm font-medium truncate", rechazo && "text-destructive", excedido && "text-warning")}>
        {formatScalar("humedad_pct", valor)}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {limite == null
          ? "sin límite cargado"
          : rechazo
            ? `supera ${limite}% + ${TOLERANCIA_HUMEDAD} de tolerancia`
            : `máx ${limite}%`}
      </p>
    </div>
  );
}

/** Lista de objetos homogéneos (ej. precintos: [{nro, peso, foto}]) */
function ListBlock({ title, items }: { title: string; items: Record<string, unknown>[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground/80">{title}</span>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md bg-secondary/40 px-2.5 py-1.5 text-xs">
            <span className="font-mono text-muted-foreground">#{i + 1}</span>
            {Object.entries(it).map(([k, v]) => (
              <span key={k}>
                <span className="text-muted-foreground">{humanizeKey(k)}:</span>{" "}
                <span className="font-medium">{typeof v === "boolean" ? (v ? "Sí" : "No") : formatScalar(k, v)}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Clasifica las claves de un objeto en escalares, checklists, listas y sub-objetos. */
function partition(obj: Record<string, unknown>) {
  const scalars: [string, unknown][] = [];
  const checklists: [string, Record<string, ChecklistValue>][] = [];
  const lists: [string, Record<string, unknown>[]][] = [];
  const nested: [string, Record<string, unknown>][] = [];

  for (const [k, v] of Object.entries(obj)) {
    if (SKIP_KEYS.has(k)) continue;
    if (isJunk(v)) continue; // "null"/"undefined" string → no mostrar
    if (isChecklistMap(v)) checklists.push([k, v]);
    else if (typeof v === "boolean") scalars.push([k, v ? "Sí" : "No"]);
    else if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (v.every(isPlainObject)) lists.push([k, v as Record<string, unknown>[]]);
      else scalars.push([k, v.join(", ")]);
    } else if (isPlainObject(v)) nested.push([k, v]);
    else if (v !== null && v !== undefined && v !== "") scalars.push([k, v]);
  }
  return { scalars, checklists, lists, nested };
}

export function EventDataView({
  datos,
  humedadMaxGrano = null,
}: {
  datos: Record<string, unknown>;
  /** Límite vigente del grano, como respaldo para eventos que no lo guardaron. */
  humedadMaxGrano?: number | null;
}) {
  const { scalars, checklists, lists, nested } = partition(datos);

  // El límite que rigió cuando se registró el evento manda sobre el actual
  // (ADR-007). Si el evento no lo trae, se usa el vigente del grano.
  const limiteHumedad = limiteHumedadValido(datos.humedad_pct_max) ?? humedadMaxGrano;

  const hasContent =
    scalars.length > 0 || checklists.length > 0 || lists.length > 0 || nested.length > 0;
  if (!hasContent) {
    return <p className="text-xs text-muted-foreground italic">Sin datos adicionales registrados.</p>;
  }

  return (
    <div className="space-y-3">
      <ScalarGrid items={scalars} limiteHumedad={limiteHumedad} />

      {checklists.map(([k, v]) => (
        <ChecklistBlock key={k} title={humanizeKey(k)} obj={v} flagWhenTrue={FLAG_WHEN_TRUE.has(k)} />
      ))}

      {lists.map(([k, v]) => (
        <ListBlock key={k} title={humanizeKey(k)} items={v} />
      ))}

      {nested.map(([k, v]) => {
        const sub = partition(v);
        return (
          <div key={k} className="rounded-lg border border-border/50 p-3">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">{humanizeKey(k)}</p>
            <div className="space-y-2">
              <ScalarGrid items={sub.scalars} limiteHumedad={limiteHumedad} />
              {sub.checklists.map(([sk, sv]) => (
                <ChecklistBlock key={sk} title={humanizeKey(sk)} obj={sv} flagWhenTrue={FLAG_WHEN_TRUE.has(sk)} />
              ))}
              {sub.lists.map(([sk, sv]) => (
                <ListBlock key={sk} title={humanizeKey(sk)} items={sv} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
