import { query } from "@/lib/db";

/**
 * Catálogo de estados operacionales del lote de materia prima.
 *
 * Sale de `fsm_estado_def`, no de una constante en el front: la tabla ya trae
 * orden, descripción y si el estado es una excepción del circuito. Agregar un
 * estado nuevo en la base lo hace aparecer en el panel sin tocar código, que es
 * el mismo criterio que usan `checklist_items` y `granos_campos_calidad`.
 *
 * Advertencia que conviene tener presente al leer el pipeline: `fn_transicion_lote`
 * NO valida contra `fsm_transicion_def` (su propio comentario dice que aplica la
 * transición "siempre, incluso si no está en el grafo"). O sea que un lote puede
 * mostrar un salto que la tabla de transiciones no contempla. El panel refleja
 * lo que pasó, no lo que debería haber pasado.
 */
export interface EstadoDef {
  estado: string;
  descripcion: string | null;
  es_terminal: boolean;
  es_excepcion: boolean;
  orden: number;
}

export async function estadosFsm(): Promise<EstadoDef[]> {
  try {
    return await query<EstadoDef>(
      `SELECT estado, descripcion, es_terminal, es_excepcion, orden
         FROM fsm_estado_def ORDER BY orden`
    );
  } catch {
    return [];
  }
}

/** Cuántos lotes de MP hay en cada estado operacional. */
export async function conteoPorEstado(): Promise<Map<string, number>> {
  try {
    const filas = await query<{ estado: string; n: string }>(
      `SELECT COALESCE(estado_operacional, 'SIN_ESTADO') AS estado, count(*) AS n
         FROM traz_trazabilidades
        WHERE estado_trazabilidad = 'ABIERTA'
        GROUP BY 1`
    );
    return new Map(filas.map((f) => [f.estado, Number(f.n)]));
  } catch {
    return new Map();
  }
}

/** Clases de color por estado. Lo excepcional se ve distinto de lo normal. */
export function claseEstado(def: Pick<EstadoDef, "es_excepcion" | "es_terminal"> | undefined) {
  if (!def) return "border-border bg-secondary text-muted-foreground";
  if (def.es_excepcion) return "border-destructive/30 bg-destructive/10 text-destructive";
  if (def.es_terminal) return "border-border bg-secondary text-muted-foreground";
  return "border-primary/30 bg-primary/10 text-primary";
}
