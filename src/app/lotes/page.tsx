import { LoginRequired } from "@/components/LoginRequired";
import { SinPermiso } from "@/components/SinPermiso";
import { LoteCard } from "@/components/LoteCard";
import { getSesion } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { listarLotes } from "@/lib/lotes";
import { BotonAyuda } from "@/components/Ayuda";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LotesPage() {
  if (!getSesion()) return <LoginRequired />;
  if (!(await puede("PANEL_TRAZABILIDAD"))) {
    return <SinPermiso permiso="PANEL_TRAZABILIDAD" detalle="Tu rol no puede ver los lotes." />;
  }

  const lotes = await listarLotes();
  const conVariosOrigenes = lotes.filter((l) => l.origenes > 1).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            📦
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Lotes de producción</h1>
              <BotonAyuda tema="lotes" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              El rótulo de estiba que abre RGAN-53 y que arrastran RGAN-57, 42, 81, 104 y 56
            </p>
          </div>
        </div>
      </div>

      {lotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium">Todavía no hay lotes de producción</p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">
            Un lote nace cuando <b>RGAN-53 (Control de Proceso)</b> abre una estiba. Hasta que eso
            pase, la materia prima se sigue por trazabilidad, no por lote.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              <b className="text-foreground">{lotes.length}</b> lotes
            </span>
            {conVariosOrigenes > 0 && (
              <span>
                <b className="text-foreground">{conVariosOrigenes}</b> alimentados por más de una
                trazabilidad
              </span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lotes.map((l) => (
              <LoteCard key={l.lote} lote={l} />
            ))}
          </div>
        </>
      )}

      <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <b className="text-foreground">De dónde sale este listado.</b> El lote de producción todavía
        no es una tabla: vive como texto dentro de los eventos y como columna en los puentes de
        liberación y despacho. El panel lo reconstruye leyendo{" "}
        <code className="font-mono">lote_produccion</code> y — porque RGAN-53 lo graba con otro
        nombre — también <code className="font-mono">estiba</code>. Si faltara ese segundo nombre, el
        evento que abre la estiba no aparecería en su propia ficha.
      </p>
    </div>
  );
}
