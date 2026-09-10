import { query, vigenteFilter, tableExists } from "@/lib/db";

/**
 * Lote de producción (rótulo de estiba, ej. `AR-WSS-LE01-26`).
 *
 * El lote NO es una entidad en la base (DT-13): vive como string dentro de los
 * eventos y como columna en los puentes de liberación y despacho. Este módulo
 * es la ÚNICA fuente que lo reconstruye, para que no haya dos criterios dando
 * números distintos.
 *
 * ── El detalle que hace falta saber ──────────────────────────────────────────
 * El mismo dato se graba con DOS nombres según quién lo escriba:
 *
 *   RGAN-53 (SWF_CONTROL_PROCESO)  → datos_evento.estiba
 *   RGAN-57 / 42 / 81              → datos_evento.lote_produccion
 *   RGAN-104 / 56                  → columna lote_produccion en los puentes
 *
 * Verificado en los INSERT vivos de los cuatro workflows. RGAN-53 es justo el
 * que ABRE la estiba, así que una consulta que mire sólo `lote_produccion` deja
 * afuera al evento que le da origen al lote — y el lote parecería empezar en el
 * embolsado. De ahí el COALESCE de abajo, que se aplica siempre.
 *
 * No se arregla en n8n a propósito: son eventos ya grabados y workflows
 * validados. El panel absorbe la diferencia en un solo lugar.
 */
export const LOTE_SQL = `COALESCE(e.datos_evento->>'lote_produccion', e.datos_evento->>'estiba')`;

export interface LoteResumen {
  lote: string;
  abierto_en: string;
  ultimo_evento: string;
  eventos: number;
  /** Cuántas trazabilidades de materia prima alimentaron este lote (N:N). */
  origenes: number;
  trazabilidades: string[];
  granos: string[];
  kg_producidos: number | null;
  unidades: number | null;
  /** Estado derivado del recorrido: ver `estadoDelLote`. */
  estado: EstadoLote;
  liberado: boolean | null;
  despachado: boolean;
}

export type EstadoLote =
  | "EN_PROCESO"
  | "EMBOLSADO"
  | "PESADO"
  | "PCC_VALIDADO"
  | "LIBERADO"
  | "BLOQUEADO"
  | "DESPACHADO";

/**
 * Estado del lote de producción.
 *
 * OJO: no es `traz_trazabilidades.estado_operacional`. Ese estado es del lote de
 * MATERIA PRIMA, y como una estiba se alimenta de varias trazabilidades, no hay
 * un único estado que copiar. Este se deriva de los hitos que el propio lote
 * alcanzó, que es lo que la ficha tiene que mostrar.
 */
export function estadoDelLote(f: {
  despachado: boolean;
  liberado: boolean | null;
  tiene_pcc_ok: boolean;
  tiene_peso: boolean;
  tiene_envasado: boolean;
}): EstadoLote {
  if (f.despachado) return "DESPACHADO";
  if (f.liberado === false) return "BLOQUEADO";
  if (f.liberado === true) return "LIBERADO";
  if (f.tiene_pcc_ok) return "PCC_VALIDADO";
  if (f.tiene_peso) return "PESADO";
  if (f.tiene_envasado) return "EMBOLSADO";
  return "EN_PROCESO";
}

export const ESTADO_LOTE_LABEL: Record<EstadoLote, string> = {
  EN_PROCESO: "En proceso",
  EMBOLSADO: "Embolsado",
  PESADO: "Peso controlado",
  PCC_VALIDADO: "PCC validado",
  LIBERADO: "Liberado",
  BLOQUEADO: "Bloqueado",
  DESPACHADO: "Despachado",
};

type FilaLote = {
  lote: string;
  abierto_en: string;
  ultimo_evento: string;
  eventos: string;
  origenes: string;
  trazabilidades: string[];
  granos: string[];
  kg_producidos: string | null;
  unidades: string | null;
  tiene_envasado: boolean;
  tiene_peso: boolean;
  tiene_pcc_ok: boolean;
};

const num = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Listado de lotes de producción, derivado de los eventos. */
export async function listarLotes(limite = 200): Promise<LoteResumen[]> {
  const vig = await vigenteFilter("e");

  const filas = await query<FilaLote>(
    `WITH ev AS (
       SELECT ${LOTE_SQL} AS lote,
              e.trazabilidad_id,
              e.tipo_evento::text AS tipo_evento,
              e.resultado::text   AS resultado,
              e.fecha_hora_evento,
              e.datos_evento
         FROM traz_eventos e
        WHERE ${LOTE_SQL} IS NOT NULL${vig}
     )
     SELECT ev.lote,
            min(ev.fecha_hora_evento) AS abierto_en,
            max(ev.fecha_hora_evento) AS ultimo_evento,
            count(*)                  AS eventos,
            count(DISTINCT ev.trazabilidad_id) AS origenes,
            array_agg(DISTINCT ev.trazabilidad_id) AS trazabilidades,
            COALESCE(
              (SELECT array_agg(DISTINCT t.codigo_grano)
                 FROM traz_trazabilidades t
                WHERE t.trazabilidad_id = ANY(array_agg(DISTINCT ev.trazabilidad_id))),
              ARRAY[]::text[]
            ) AS granos,
            sum((ev.datos_evento->>'kg_totales')::numeric)
              FILTER (WHERE ev.tipo_evento = 'EV_PRODUCCION_ENVASADO')     AS kg_producidos,
            sum((ev.datos_evento->>'cantidad_bolsas')::numeric)
              FILTER (WHERE ev.tipo_evento = 'EV_PRODUCCION_ENVASADO')     AS unidades,
            bool_or(ev.tipo_evento = 'EV_PRODUCCION_ENVASADO')             AS tiene_envasado,
            bool_or(ev.tipo_evento = 'EV_CONTROL_PESO_BOLSAS')             AS tiene_peso,
            bool_or(ev.tipo_evento = 'EV_PCC_DETECTOR_METALES'
                    AND ev.resultado IN ('OK','APROBADO'))                 AS tiene_pcc_ok
       FROM ev
      GROUP BY ev.lote
      ORDER BY max(ev.fecha_hora_evento) DESC
      LIMIT ${Number(limite) || 200}`
  );

  const liberaciones = await mapaLiberaciones();
  const despachos = await mapaDespachados();

  return filas.map((f) => {
    const liberado = liberaciones.get(f.lote) ?? null;
    const despachado = despachos.has(f.lote);
    return {
      lote: f.lote,
      abierto_en: f.abierto_en,
      ultimo_evento: f.ultimo_evento,
      eventos: Number(f.eventos),
      origenes: Number(f.origenes),
      trazabilidades: f.trazabilidades || [],
      granos: f.granos || [],
      kg_producidos: num(f.kg_producidos),
      unidades: num(f.unidades),
      liberado,
      despachado,
      estado: estadoDelLote({
        despachado,
        liberado,
        tiene_pcc_ok: f.tiene_pcc_ok,
        tiene_peso: f.tiene_peso,
        tiene_envasado: f.tiene_envasado,
      }),
    };
  });
}

/**
 * lote → apto para consumo humano (true/false), o ausente si nunca se liberó.
 * Si un lote tiene más de una liberación gana la más reciente.
 */
async function mapaLiberaciones(): Promise<Map<string, boolean>> {
  if (!(await tableExists("traz_liberaciones_lotes"))) return new Map();
  const filas = await query<{ lote_produccion: string; condicion: boolean }>(
    `SELECT DISTINCT ON (ll.lote_produccion)
            ll.lote_produccion, l.condicion_consumo_humano AS condicion
       FROM traz_liberaciones_lotes ll
       JOIN traz_liberaciones l USING (liberacion_id)
      ORDER BY ll.lote_produccion, l.created_at DESC`
  );
  return new Map(filas.map((f) => [f.lote_produccion, f.condicion]));
}

async function mapaDespachados(): Promise<Set<string>> {
  if (!(await tableExists("traz_despachos_lotes"))) return new Set();
  const filas = await query<{ lote_produccion: string }>(
    `SELECT DISTINCT lote_produccion FROM traz_despachos_lotes WHERE lote_produccion IS NOT NULL`
  );
  return new Set(filas.map((f) => f.lote_produccion));
}

// ─────────────────────────────────────────────────────────────────────────────
// Ficha de un lote
// ─────────────────────────────────────────────────────────────────────────────

export interface EventoLote {
  evento_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  trazabilidad_id: string;
  datos: Record<string, unknown>;
  firma_auditoria_id?: string | null;
}

export interface OrigenLote {
  trazabilidad_id: string;
  codigo_grano: string;
  codigo_establecimiento: string;
  campania: string;
  estado_operacional: string | null;
  eventos_en_lote: number;
}

export interface LiberacionLote {
  liberacion_id: string;
  fecha_liberacion: string;
  producto: string | null;
  contrato_po: string | null;
  cliente_destino: string | null;
  laboratorio: string | null;
  informe_nro: string | null;
  tipo_analisis: string[] | null;
  validacion_etiqueta: boolean | null;
  empaque: string | null;
  kg_total: number | null;
  condicion_consumo_humano: boolean;
  responsable_nombre: string | null;
  observaciones: string | null;
  /** Los otros lotes que salieron en la misma liberación (ADR-002 multi-lote). */
  lotes_hermanos: string[];
}

export interface DespachoLote {
  despacho_id: string;
  fecha_despacho: string;
  remito_nro: string;
  cliente_destino: string | null;
  lugar_entrega: string | null;
  transporte: string | null;
  chofer_nombre: string | null;
  patente_tractor: string | null;
  patente_acoplado: string | null;
  empaque: string | null;
  unidades: number | null;
  kg: number | null;
  responsable_nombre: string | null;
  lotes_hermanos: string[];
}

export interface DocumentoLote {
  doc_id: string;
  tipo_doc: string;
  nombre_archivo: string | null;
  url_drive: string | null;
  hash_sha256: string | null;
  created_at: string;
}

export interface FichaLote {
  lote: string;
  resumen: LoteResumen | null;
  origenes: OrigenLote[];
  eventos: EventoLote[];
  liberaciones: LiberacionLote[];
  despachos: DespachoLote[];
  documentos: DocumentoLote[];
}

export async function fichaLote(lote: string): Promise<FichaLote> {
  const vig = await vigenteFilter("e");

  const eventos = await query<EventoLote & { eventos?: string }>(
    `SELECT e.evento_id,
            e.tipo_evento::text AS tipo_evento,
            e.fecha_hora_evento AS fecha,
            e.resultado::text   AS resultado,
            e.responsable_nombre AS responsable,
            e.trazabilidad_id,
            e.datos_evento AS datos,
            e.firma_auditoria_id
       FROM traz_eventos e
      WHERE ${LOTE_SQL} = $1${vig}
      ORDER BY e.fecha_hora_evento`,
    [lote]
  );

  const origenes = await query<OrigenLote & { eventos_en_lote: string }>(
    `SELECT t.trazabilidad_id, t.codigo_grano, t.codigo_establecimiento, t.campania,
            t.estado_operacional,
            count(e.evento_id) AS eventos_en_lote
       FROM traz_trazabilidades t
       JOIN traz_eventos e ON e.trazabilidad_id = t.trazabilidad_id AND ${LOTE_SQL} = $1
      GROUP BY t.trazabilidad_id, t.codigo_grano, t.codigo_establecimiento, t.campania, t.estado_operacional
      ORDER BY min(e.fecha_hora_evento)`,
    [lote]
  );

  const liberaciones = (await tableExists("traz_liberaciones_lotes"))
    ? await query<LiberacionLote>(
        `SELECT l.liberacion_id, l.fecha_liberacion, l.producto, l.contrato_po, l.cliente_destino,
                l.laboratorio, l.informe_nro, l.tipo_analisis, l.validacion_etiqueta, l.empaque,
                l.kg_total, l.condicion_consumo_humano, l.responsable_nombre, l.observaciones,
                COALESCE((SELECT array_agg(o.lote_produccion ORDER BY o.lote_produccion)
                            FROM traz_liberaciones_lotes o
                           WHERE o.liberacion_id = l.liberacion_id
                             AND o.lote_produccion <> $1), ARRAY[]::text[]) AS lotes_hermanos
           FROM traz_liberaciones_lotes ll
           JOIN traz_liberaciones l USING (liberacion_id)
          WHERE ll.lote_produccion = $1
          ORDER BY l.created_at DESC`,
        [lote]
      )
    : [];

  const despachos = (await tableExists("traz_despachos_lotes"))
    ? await query<DespachoLote>(
        `SELECT d.despacho_id, d.fecha_despacho, d.remito_nro, d.cliente_destino, d.lugar_entrega,
                d.transporte, d.chofer_nombre, d.patente_tractor, d.patente_acoplado, d.empaque,
                dl.unidades, dl.kg, d.responsable_nombre,
                COALESCE((SELECT array_agg(o.lote_produccion ORDER BY o.lote_produccion)
                            FROM traz_despachos_lotes o
                           WHERE o.despacho_id = d.despacho_id
                             AND o.lote_produccion <> $1), ARRAY[]::text[]) AS lotes_hermanos
           FROM traz_despachos_lotes dl
           JOIN traz_despachos d USING (despacho_id)
          WHERE dl.lote_produccion = $1
          ORDER BY d.created_at DESC`,
        [lote]
      )
    : [];

  // Documentos: hoy `documentos` está vacía y su url_drive es NOT NULL (asume
  // Drive, que quedó descartado). Se consulta igual para que el día que se
  // conecte Supabase Storage la ficha los muestre sin tocar esto. Ver DT-14.
  let documentos: DocumentoLote[] = [];
  const ids = eventos.map((e) => e.evento_id);
  if (ids.length) {
    try {
      documentos = await query<DocumentoLote>(
        `SELECT doc_id, tipo_doc, nombre_archivo, url_drive, hash_sha256, created_at
           FROM documentos
          WHERE evento_id = ANY($1::uuid[])
          ORDER BY created_at DESC`,
        [ids]
      );
    } catch {
      /* la tabla puede no existir en una base vieja */
    }
  }

  // El resumen se arma con lo que ya se trajo. Antes salía de listarLotes(500),
  // que agrega TODOS los lotes de la base para quedarse con uno: la ficha pagaba
  // un barrido completo por cada visita.
  const suma = (tipo: string, clave: string) => {
    const total = eventos
      .filter((e) => e.tipo_evento === tipo)
      .reduce((a, e) => a + Number((e.datos as Record<string, unknown>)?.[clave] ?? 0), 0);
    return total || null;
  };

  const liberado = liberaciones.length ? liberaciones[0].condicion_consumo_humano : null;
  const despachado = despachos.length > 0;

  const resumen: LoteResumen | null = eventos.length
    ? {
        lote,
        abierto_en: eventos[0].fecha,
        ultimo_evento: eventos[eventos.length - 1].fecha,
        eventos: eventos.length,
        origenes: origenes.length,
        trazabilidades: origenes.map((o) => o.trazabilidad_id),
        granos: Array.from(new Set(origenes.map((o) => o.codigo_grano))),
        kg_producidos: suma("EV_PRODUCCION_ENVASADO", "kg_totales"),
        unidades: suma("EV_PRODUCCION_ENVASADO", "cantidad_bolsas"),
        liberado,
        despachado,
        estado: estadoDelLote({
          despachado,
          liberado,
          tiene_pcc_ok: eventos.some(
            (e) => e.tipo_evento === "EV_PCC_DETECTOR_METALES" && ["OK", "APROBADO"].includes(e.resultado)
          ),
          tiene_peso: eventos.some((e) => e.tipo_evento === "EV_CONTROL_PESO_BOLSAS"),
          tiene_envasado: eventos.some((e) => e.tipo_evento === "EV_PRODUCCION_ENVASADO"),
        }),
      }
    : null;

  return {
    lote,
    resumen,
    origenes: origenes.map((o) => ({ ...o, eventos_en_lote: Number(o.eventos_en_lote) })),
    eventos,
    liberaciones,
    despachos,
    documentos,
  };
}
