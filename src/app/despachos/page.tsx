import Link from "next/link";
import { Truck, PenLine, AlertTriangle } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { despachos } from "@/lib/operacion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = (n: number | null) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR"));

export default async function DespachosPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver los despachos." />;
  }

  const filas = await despachos();
  const kgTotal = filas.reduce((a, d) => a + Number(d.kg_total || 0), 0);
  const repetidos = filas.filter((d) => d.remito_repetido).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            🚚
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Despachos</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              RGAN-56 — cierra la cadena operativa: qué salió, cuánto y para quién
            </p>
          </div>
        </div>
        {filas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span>
              <b className="text-foreground">{filas.length}</b> remitos
            </span>
            <span>
              <b className="text-foreground">{kgTotal.toLocaleString("es-AR")}</b> kg despachados
            </span>
            {repetidos > 0 && (
              <span className="text-warning">
                <b>{repetidos}</b> con número de remito repetido
              </span>
            )}
          </div>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium">Todavía no hay despachos</p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">
            Se registran desde el bot. Cada remito guarda <b>unidades y kg por lote</b>, que es lo
            que permite cuantificar un retiro si hiciera falta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filas.map((d) => (
            <article key={d.despacho_id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm font-bold">{d.remito_nro}</span>
                {d.remito_repetido && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    <AlertTriangle className="h-3 w-3" /> número repetido
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{d.cliente_destino}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(d.fecha_despacho).toLocaleDateString("es-AR")}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Dato label="Unidades" valor={fmt(d.unidades_total)} />
                <Dato label="Kg totales" valor={fmt(d.kg_total)} />
                <Dato label="Empaque" valor={d.empaque || "—"} />
                <Dato label="Peso unitario" valor={fmt(d.peso_unitario_kg)} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Dato label="Chofer" valor={d.chofer_nombre || "—"} />
                <Dato label="Documento" valor={d.chofer_documento || "—"} />
                <Dato label="Tractor" valor={d.patente_tractor || "—"} />
                <Dato label="Acoplado" valor={d.patente_acoplado || "—"} />
              </div>

              {d.lugar_entrega && (
                <p className="mt-2 text-[11px] text-muted-foreground">Entrega: {d.lugar_entrega}</p>
              )}

              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Detalle por lote ({d.lotes.length})
                </p>
                <div className="mt-1 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[11px] text-muted-foreground">
                      <tr>
                        <th className="py-1 text-left font-medium">Lote</th>
                        <th className="py-1 text-left font-medium">Trazabilidad</th>
                        <th className="py-1 text-right font-medium">Unidades</th>
                        <th className="py-1 text-right font-medium">Kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {d.lotes.map((l, i) => (
                        <tr key={`${l.lote_produccion}-${i}`}>
                          <td className="py-1 font-mono">
                            {l.lote_produccion ? (
                              <Link
                                href={`/lotes/${encodeURIComponent(l.lote_produccion)}`}
                                className="text-primary hover:underline"
                              >
                                {l.lote_produccion}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-1 font-mono text-muted-foreground">{l.trazabilidad_id}</td>
                          <td className="py-1 text-right tabular-nums">{fmt(l.unidades)}</td>
                          <td className="py-1 text-right tabular-nums">{fmt(l.kg)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {d.responsable_nombre && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <PenLine className="h-3 w-3" /> {d.responsable_nombre}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-semibold tabular-nums">{valor}</p>
    </div>
  );
}
