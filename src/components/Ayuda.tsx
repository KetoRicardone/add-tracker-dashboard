"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import { AYUDA, NOTA_GENERAL, MANUAL_URL, type TemaAyuda, type SeccionAyuda } from "@/lib/ayuda";
import { cn } from "@/lib/utils";

// Ayuda en pantalla: un botón «?» al lado del título de cada sección que abre
// un popup con la explicación de ESA pantalla — qué hace, qué datos maneja,
// qué condiciones tiene y cómo se usa bien.
//
// El texto no vive acá sino en @/lib/ayuda: este archivo sólo sabe pintarlo.
//
// El popup va por portal a <body> para que ninguna tarjeta con overflow o
// z-index se lo coma: hay botones «?» dentro de encabezados con gradiente y
// dentro de paneles con scroll propio.

export function BotonAyuda({
  tema,
  className,
  tamano = "md",
}: {
  tema: string;
  className?: string;
  /** `sm` para títulos de sección; `md` para encabezados de página. */
  tamano?: "sm" | "md";
}) {
  const [abierto, setAbierto] = useState(false);
  const contenido = AYUDA[tema];

  // Un tema mal escrito no debe romper la pantalla: no se pinta el botón.
  if (!contenido) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Ayuda: ${contenido.titulo}`}
        title="¿Cómo se usa esta pantalla?"
        className={cn(
          "inline-flex flex-shrink-0 items-center justify-center rounded-full border border-primary/30",
          "bg-primary/10 font-bold leading-none text-primary transition-colors",
          "hover:border-primary/60 hover:bg-primary/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          tamano === "sm" ? "h-[18px] w-[18px] text-[11px]" : "h-6 w-6 text-[13px]",
          className
        )}
      >
        ?
      </button>
      {abierto && <ModalAyuda contenido={contenido} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function ModalAyuda({ contenido, onCerrar }: { contenido: TemaAyuda; onCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  // El portal sólo existe en el navegador: en el render del servidor no hay
  // document. Sin esta guarda, el build de Next se rompe.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Escape cierra, y mientras está abierto el fondo no scrollea.
  useEffect(() => {
    const alTeclear = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  if (!montado) return null;

  const modal = (
    <div
      onMouseDown={onCerrar}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Ayuda: ${contenido.titulo}`}
        onMouseDown={(ev) => ev.stopPropagation()}
        className="flex max-h-[86vh] w-full max-w-[720px] flex-col rounded-xl border border-border bg-card shadow-2xl outline-none"
      >
        {/* encabezado */}
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {contenido.icono}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold tracking-tight">{contenido.titulo}</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {contenido.resumen}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la ayuda"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        {/* cuerpo */}
        <div className="overflow-y-auto px-5 pb-5 pt-1">
          {contenido.secciones.map((s, i) => (
            <Seccion key={i} seccion={s} />
          ))}
        </div>

        {/* pie */}
        <footer className="flex flex-wrap items-center gap-3 rounded-b-xl border-t border-border bg-secondary/40 px-5 py-3">
          <p className="min-w-[200px] flex-1 text-[10.5px] leading-snug text-muted-foreground">
            {NOTA_GENERAL}
          </p>
          {/* El ancla lleva al capítulo de ESTA pantalla, no al principio del
              manual: el popup es el resumen y el manual, la versión larga. */}
          <a
            href={contenido.ancla ? `${MANUAL_URL}#${contenido.ancla}` : MANUAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-shrink-0 items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline"
          >
            Manual completo <ExternalLink className="h-3 w-3" />
          </a>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function Seccion({ seccion }: { seccion: SeccionAyuda }) {
  return (
    <section className="mt-4">
      {seccion.titulo && (
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {seccion.titulo}
        </h3>
      )}

      {seccion.tipo === "parrafos" &&
        seccion.items.map((t, i) => (
          <p key={i} className="mb-2 text-[12.5px] leading-relaxed last:mb-0">
            {t}
          </p>
        ))}

      {seccion.tipo === "lista" && (
        <ul className="grid list-disc gap-1.5 pl-5 text-[12.5px] leading-relaxed">
          {seccion.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}

      {seccion.tipo === "pasos" && (
        <ol className="grid list-decimal gap-1.5 pl-5 text-[12.5px] leading-relaxed">
          {seccion.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      )}

      {seccion.tipo === "campos" && (
        <div className="grid gap-1.5">
          {seccion.items.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold">{c.nombre}</span>
                {c.req && (
                  <span className="rounded-full bg-destructive/10 px-2 py-px text-[9.5px] font-bold uppercase tracking-wide text-destructive">
                    obligatorio
                  </span>
                )}
                {c.valores && (
                  <span className="rounded border border-border bg-card px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                    {c.valores}
                  </span>
                )}
              </div>
              {c.detalle && (
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{c.detalle}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {seccion.tipo === "faq" && (
        <div className="grid gap-2.5">
          {seccion.items.map((f, i) => (
            <div key={i}>
              <p className="text-xs font-bold">{f.p}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{f.r}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default BotonAyuda;
