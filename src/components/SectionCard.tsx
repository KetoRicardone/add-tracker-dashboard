import { cn } from "@/lib/utils";

/** Bloque con título, contador opcional y estado vacío propio. */
export function SectionCard({
  titulo,
  emoji,
  subtitulo,
  contador,
  vacio,
  children,
  className,
}: {
  titulo: string;
  emoji?: string;
  subtitulo?: string;
  contador?: number;
  /** Qué decir cuando no hay filas. Si no viene, igual se muestra el bloque. */
  vacio?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const sinDatos = contador === 0;
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {emoji && <span>{emoji}</span>}
            {titulo}
            {contador !== undefined && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {contador}
              </span>
            )}
          </h2>
          {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
      </header>
      <div className="p-5">
        {sinDatos && vacio ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {vacio}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
