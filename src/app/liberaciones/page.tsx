import Link from "next/link";
import { ShieldCheck, ShieldX, PenLine } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { liberaciones } from "@/lib/operacion";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = (n: number | null) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR"));

export default async function LiberacionesPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver las liberaciones." />;
  }

  const filas = await liberaciones();
  const bloqueadas = filas.filter((l) => !l.condicion_consumo_humano).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            🛡
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Liberación de producto</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              RGAN-104 — el gate que decide si la mercadería sale a consumo humano
            </p>
          </div>
        </div>
        {filas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span>
              <b className="text-foreground">{filas.length}</b> liberaciones
            </span>
            <span className={cn(bloqueadas > 0 && "text-destructive")}>
              <b>{bloqueadas}</b> marcadas NO APTO
            </span>
          </div>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium">Todavía no hay liberaciones</p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">
            Se cargan desde el bot. Una liberación puede cubrir <b>varios lotes</b> bajo un mismo
            informe de laboratorio: el formulario de papel tiene cinco renglones de lote.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filas.map((l) => (
            <article
              key={l.liberacion_id}
              className={cn(
                "rounded-xl border p-5",
                l.condicion_consumo_humano
                  ? "border-border bg-card"
                  : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {l.condicion_consumo_humano ? (
                  <ShieldCheck className="h-4 w-4 text-success" />
                ) : (
                  <ShieldX className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={cn(
                    "text-sm font-semibold",
                    l.condicion_consumo_humano ? "text-success" : "text-destructive"
                  )}
                >
                  {l.condicion_consumo_humano ? "APTO para consumo humano" : "NO APTO — bloqueado"}
                </span>
                {l.informe_nro && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Informe {l.informe_nro}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(l.fecha_liberacion).toLocaleDateString("es-AR")}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium">{l.producto || "Producto sin especificar"}</p>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Dato label="Cliente" valor={l.cliente_destino || "—"} />
                <Dato label="Laboratorio" valor={l.laboratorio || "—"} />
                <Dato label="Empaque" valor={l.empaque || "—"} />
                <Dato label="Kg" valor={fmt(l.kg_total)} />
              </div>

              {(l.tipo_analisis || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(l.tipo_analisis || []).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lotes cubiertos ({l.lotes.length})
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {l.lotes.map((lote) => (
                    <Link
                      key={lote}
                      href={`/lotes/${encodeURIComponent(lote)}`}
                      className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs transition-colors hover:border-primary/50"
                    >
                      {lote}
                    </Link>
                  ))}
                </div>
              </div>

              {l.responsable_nombre && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <PenLine className="h-3 w-3" /> {l.responsable_nombre}
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
      <p className="truncate text-xs font-semibold">{valor}</p>
    </div>
  );
}
