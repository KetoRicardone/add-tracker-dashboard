import { query, tableExists } from "@/lib/db";

/**
 * Consultas de las tres pantallas operativas que no cuelgan del lote de materia
 * prima: eventos de planta (RGAN-40/80), liberaciones (RGAN-104) y despachos
 * (RGAN-56).
 *
 * Las tres degradan a lista vacía si su migración no corrió, en vez de romper la
 * página: el panel tiene que poder deployarse antes que la base.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Eventos de planta — RGAN-40 y RGAN-80 (ADR-001)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventoPlantaFila {
  evento_planta_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  planta_codigo: string;
  planta_nombre: string | null;
  turno: string | null;
  datos: Record<string, unknown>;
  firma_auditoria_id: string | null;
  verificador_nombre: string | null;
  firma_verificacion_id: string | null;
}

export async function eventosPlanta(limite = 100): Promise<EventoPlantaFila[]> {
  if (!(await tableExists("traz_eventos_planta"))) return [];
  return query<EventoPlantaFila>(
    `SELECT p.evento_planta_id,
            p.tipo_evento::text AS tipo_evento,
            p.fecha_hora_evento AS fecha,
            p.resultado::text   AS resultado,
            p.responsable_nombre AS responsable,
            p.planta_codigo,
            pl.nombre AS planta_nombre,
            p.turno,
            p.datos_evento AS datos,
            p.firma_auditoria_id,
            p.verificador_nombre,
            p.firma_verificacion_id
       FROM traz_eventos_planta p
       LEFT JOIN plantas pl ON pl.codigo = p.planta_codigo
      WHERE p.estado_evento <> 'ANULADO' AND p.superseded_by IS NULL
      ORDER BY p.fecha_hora_evento DESC
      LIMIT ${Number(limite) || 100}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Liberaciones — RGAN-104 (cabecera + puente, ADR-002 multi-lote)
// ─────────────────────────────────────────────────────────────────────────────

export interface LiberacionFila {
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
  created_at: string;
  lotes: string[];
  trazabilidades: string[];
}

export async function liberaciones(limite = 100): Promise<LiberacionFila[]> {
  if (!(await tableExists("traz_liberaciones"))) return [];
  return query<LiberacionFila>(
    `SELECT l.*,
            COALESCE((SELECT array_agg(ll.lote_produccion ORDER BY ll.lote_produccion)
                        FROM traz_liberaciones_lotes ll
                       WHERE ll.liberacion_id = l.liberacion_id), ARRAY[]::text[]) AS lotes,
            COALESCE((SELECT array_agg(DISTINCT ll.trazabilidad_id)
                        FROM traz_liberaciones_lotes ll
                       WHERE ll.liberacion_id = l.liberacion_id), ARRAY[]::text[]) AS trazabilidades
       FROM traz_liberaciones l
      ORDER BY l.created_at DESC
      LIMIT ${Number(limite) || 100}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Despachos — RGAN-56
// ─────────────────────────────────────────────────────────────────────────────

export interface DespachoLoteFila {
  trazabilidad_id: string;
  lote_produccion: string | null;
  unidades: number | null;
  kg: number | null;
}

export interface DespachoFila {
  despacho_id: string;
  fecha_despacho: string;
  remito_nro: string;
  cliente_destino: string | null;
  lugar_entrega: string | null;
  transporte: string | null;
  chofer_nombre: string | null;
  chofer_documento: string | null;
  patente_tractor: string | null;
  patente_acoplado: string | null;
  empaque: string | null;
  peso_unitario_kg: number | null;
  unidades_total: number | null;
  kg_total: number | null;
  responsable_nombre: string | null;
  observaciones: string | null;
  created_at: string;
  /** Unidades y kg POR LOTE: es lo que permite cuantificar un retiro. */
  lotes: DespachoLoteFila[];
  /** Más de un remito con el mismo número: el bot avisa pero no lo impide. */
  remito_repetido: boolean;
}

export async function despachos(limite = 100): Promise<DespachoFila[]> {
  if (!(await tableExists("traz_despachos"))) return [];
  const filas = await query<DespachoFila & { lotes: string | DespachoLoteFila[] }>(
    `SELECT d.*,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'trazabilidad_id', dl.trazabilidad_id,
                        'lote_produccion', dl.lote_produccion,
                        'unidades', dl.unidades,
                        'kg', dl.kg) ORDER BY dl.lote_produccion)
                        FROM traz_despachos_lotes dl
                       WHERE dl.despacho_id = d.despacho_id), '[]'::jsonb) AS lotes,
            (SELECT count(*) > 1 FROM traz_despachos o WHERE o.remito_nro = d.remito_nro) AS remito_repetido
       FROM traz_despachos d
      ORDER BY d.created_at DESC
      LIMIT ${Number(limite) || 100}`
  );
  return filas.map((f) => ({
    ...f,
    lotes: (typeof f.lotes === "string" ? JSON.parse(f.lotes) : f.lotes) as DespachoLoteFila[],
  }));
}
