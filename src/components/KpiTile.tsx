import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Número grande con etiqueta. Es la unidad de la Torre de Control.
 * `nota` sirve para decir de dónde sale el número cuando no es obvio — un KPI
 * sin origen explicable es un KPI en el que nadie confía.
 */
export function KpiTile({
  label,
  valor,
  nota,
  icono,
  href,
  tono = "normal",
}: {
  label: string;
  valor: string | number;
  nota?: string;
  icono?: string;
  href?: string;
  tono?: "normal" | "alerta" | "exito";
}) {
  const contenido = (
    <div
      className={cn(
        "h-full rounded-xl border p-4 transition-colors",
        tono === "alerta"
          ? "border-destructive/30 bg-destructive/5"
          : tono === "exito"
          ? "border-success/30 bg-success/5"
          : "border-border bg-card",
        href && "hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icono && <span className="text-base leading-none">{icono}</span>}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums tracking-tight",
          tono === "alerta" && "text-destructive",
          tono === "exito" && "text-success"
        )}
      >
        {valor}
      </p>
      {nota && <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{nota}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {contenido}
    </Link>
  ) : (
    contenido
  );
}
