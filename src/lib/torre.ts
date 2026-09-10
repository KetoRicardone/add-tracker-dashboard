import { query, tableExists, vigenteFilter } from "@/lib/db";
import { LOTE_SQL } from "@/lib/lotes";

/**
 * Datos de la Torre de Control. Todo lectura, todo derivado de lo que ya
 * escriben los workflows: acá no se calcula nada que después se guarde
 * (ADR-014 — los resultados calculados no se persisten como eventos).
 */
export interface Kpis {
  trazabilidades_abiertas: number;
  lotes_produccion: number;
  eventos_hoy: number;
  eventos_semana: number;
  kg_despachados: number;
  liberaciones: number;
  bloqueados: number;
  eventos_planta_semana: number;
  firmas_semana: number;
}

export async function kpis(): Promise<Kpis> {
  const vig = await vigenteFilter("e");
  const hayPlanta = await tableExists("traz_eventos_planta");
  const hayDespachos = await tableExists("traz_despachos");

  const [fila] = await query<Record<string, string>>(
    `SELECT
       (SELECT count(*) FROM traz_trazabilidades WHERE estado_trazabilidad = 'ABIERTA') AS trazabilidades_abiertas,
       (SELECT count(DISTINCT ${LOTE_SQL}) FROM traz_eventos e
         WHERE ${LOTE_SQL} IS NOT NULL${vig}) AS lotes_produccion,
       (SELECT count(*) FROM traz_eventos e
         WHERE e.fecha_hora_evento >= date_trunc('day', now())${vig}) AS eventos_hoy,
       (SELECT count(*) FROM traz_eventos e
         WHERE e.fecha_hora_evento >= now() - interval '7 days'${vig}) AS eventos_semana,
       ${hayDespachos ? `(SELECT COALESCE(sum(kg_total), 0) FROM traz_despachos)` : `0`} AS kg_despachados,
       ${hayDespachos ? `(SELECT count(*) FROM traz_liberaciones)` : `0`} AS liberaciones,
       ${hayDespachos ? `(SELECT count(*) FROM traz_liberaciones WHERE condicion_consumo_humano IS FALSE)` : `0`} AS bloqueados,
       ${hayPlanta ? `(SELECT count(*) FROM traz_eventos_planta WHERE fecha_hora_evento >= now() - interval '7 days' AND estado_evento <> 'ANULADO')` : `0`} AS eventos_planta_semana,
       (SELECT count(*) FROM auditoria_firmas WHERE fecha >= now() - interval '7 days') AS firmas_semana`
  );

  const n = (k: string) => Number(fila?.[k] ?? 0);
  return {
    trazabilidades_abiertas: n("trazabilidades_abiertas"),
    lotes_produccion: n("lotes_produccion"),
    eventos_hoy: n("eventos_hoy"),
    eventos_semana: n("eventos_semana"),
    kg_despachados: n("kg_despachados"),
    liberaciones: n("liberaciones"),
    bloqueados: n("bloqueados"),
    eventos_planta_semana: n("eventos_planta_semana"),
    firmas_semana: n("firmas_semana"),
  };
}

export interface Alerta {
  nivel: "alta" | "media";
  titulo: string;
  detalle: string;
  href?: string;
}

/**
 * Lo que hay que mirar hoy. Son consultas de excepción, no un semáforo
 * inventado: cada una corresponde a una regla real del circuito.
 */
export async function alertas(): Promise<Alerta[]> {
  const out: Alerta[] = [];
  const vig = await vigenteFilter("e");

  // Lotes retenidos / bloqueados / rechazados: los estados de excepción de la FSM.
  try {
    const filas = await query<{ estado_operacional: string; n: string }>(
      `SELECT t.estado_operacional, count(*) AS n
         FROM traz_trazabilidades t
         JOIN fsm_estado_def f ON f.estado = t.estado_operacional
        WHERE f.es_excepcion AND t.estado_trazabilidad = 'ABIERTA'
        GROUP BY 1 ORDER BY 1`
    );
    for (const f of filas) {
      out.push({
        nivel: "alta",
        titulo: `${f.n} ${Number(f.n) === 1 ? "lote" : "lotes"} en ${f.estado_operacional}`,
        detalle: "Estado de excepción de la FSM: la cadena está cortada hasta que se resuelva.",
        href: "/trazabilidades",
      });
    }
  } catch {
    /* fsm_estado_def puede no existir */
  }

  // PCC con falla: el evento queda como evidencia y el lote no transiciona.
  try {
    const [f] = await query<{ n: string }>(
      `SELECT count(*) AS n FROM traz_eventos e
        WHERE e.tipo_evento = 'EV_PCC_DETECTOR_METALES'
          AND (e.resultado::text IN ('NO_OK','RECHAZADO')
               OR COALESCE((e.datos_evento->>'lecturas_con_falla')::int, 0) > 0)${vig}`
    );
    if (Number(f?.n) > 0) {
      out.push({
        nivel: "alta",
        titulo: `${f.n} control de PCC con falla`,
        detalle: "RGAN-81 detectó metal. El lote no avanza hasta resolverlo (RGAN-82).",
        href: "/eventos",
      });
    }
  } catch {
    /* sin datos */
  }

  // Liberaciones NO APTO: mercadería que no sale a consumo humano.
  try {
    const [f] = await query<{ n: string }>(
      `SELECT count(*) AS n FROM traz_liberaciones WHERE condicion_consumo_humano IS FALSE`
    );
    if (Number(f?.n) > 0) {
      out.push({
        nivel: "alta",
        titulo: `${f.n} liberación marcada NO APTO`,
        detalle: "RGAN-104 bloqueó el producto para consumo humano.",
        href: "/liberaciones",
      });
    }
  } catch {
    /* F0_027 sin aplicar */
  }

  // Eventos sin firma: el registro existe pero nadie se hizo responsable.
  try {
    const [f] = await query<{ n: string }>(
      `SELECT count(*) AS n FROM traz_eventos e
        WHERE e.firma_auditoria_id IS NULL
          AND e.tipo_evento IN ('EV_PCC_DETECTOR_METALES','EV_LIBERACION_PRODUCTO','EV_REMITO_DESPACHO')${vig}`
    );
    if (Number(f?.n) > 0) {
      out.push({
        nivel: "media",
        titulo: `${f.n} evento crítico sin firma`,
        detalle: "PCC, liberación o despacho registrados sin firma de responsable.",
        href: "/eventos",
      });
    }
  } catch {
    /* sin datos */
  }

  return out;
}

/** Últimos movimientos, mezclando eventos de lote y de planta. */
export interface Movimiento {
  evento_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  trazabilidad_id: string | null;
  ambito: "LOTE" | "PLANTA";
  lote: string | null;
}

export async function ultimosMovimientos(limite = 12): Promise<Movimiento[]> {
  const vig = await vigenteFilter("e");
  const lote = await query<Movimiento>(
    `SELECT e.evento_id, e.tipo_evento::text AS tipo_evento, e.fecha_hora_evento AS fecha,
            e.resultado::text AS resultado, e.responsable_nombre AS responsable,
            e.trazabilidad_id, 'LOTE' AS ambito, ${LOTE_SQL} AS lote
       FROM traz_eventos e
      WHERE 1=1${vig}
      ORDER BY e.fecha_hora_evento DESC
      LIMIT ${Number(limite) || 12}`
  );

  let planta: Movimiento[] = [];
  if (await tableExists("traz_eventos_planta")) {
    planta = await query<Movimiento>(
      `SELECT p.evento_planta_id AS evento_id, p.tipo_evento::text AS tipo_evento,
              p.fecha_hora_evento AS fecha, p.resultado::text AS resultado,
              p.responsable_nombre AS responsable,
              NULL::text AS trazabilidad_id, 'PLANTA' AS ambito, NULL::text AS lote
         FROM traz_eventos_planta p
        WHERE p.estado_evento <> 'ANULADO' AND p.superseded_by IS NULL
        ORDER BY p.fecha_hora_evento DESC
        LIMIT ${Number(limite) || 12}`
    );
  }

  return [...lote, ...planta]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, limite);
}
