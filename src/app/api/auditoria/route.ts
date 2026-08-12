import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Rastro de ADR-009: los eventos no se borran ni se editan. Se anulan (queda la
// fila en ANULADO) o se supersedan por una corrección. Las dos cosas dejan una
// fila en traz_eventos_anulaciones — la que trae evento_reemplazo_id es corrección.
export async function GET() {
  const err = await guardPermiso("PANEL_AUDITORIA");
  if (err) return err;

  try {
    const movimientos = await query(
      `SELECT a.anulacion_id,
              a.evento_id,
              a.anulado_at,
              a.motivo,
              a.evento_reemplazo_id,
              (a.evento_reemplazo_id IS NOT NULL) AS es_correccion,
              COALESCE(u.nombre, '—')             AS actor,
              u.rol::text                          AS actor_rol,
              e.tipo_evento::text                  AS tipo_evento,
              e.estado_evento::text                AS estado_evento,
              e.created_at                         AS evento_fecha,
              e.responsable_nombre,
              e.trazabilidad_id,
              e.datos_evento->>'codigo_rgan'       AS codigo_rgan,
              e.datos_evento->>'cpe'               AS cpe,
              t.codigo_grano,
              t.estado_operacional
         FROM traz_eventos_anulaciones a
         LEFT JOIN usuarios u            ON u.usuario_id = a.anulado_por_usuario_id
         LEFT JOIN traz_eventos e        ON e.evento_id = a.evento_id
         LEFT JOIN traz_trazabilidades t ON t.trazabilidad_id = e.trazabilidad_id
        ORDER BY a.anulado_at DESC
        LIMIT 300`
    );

    // Vueltas atrás de estado registradas por la anulación (ver route de anular).
    const reversiones = await query(
      `SELECT trazabilidad_id, estado_anterior, estado_nuevo, motivo, fecha_hora
         FROM traz_transiciones
        WHERE tipo_evento = 'EV_ANULACION'
        ORDER BY fecha_hora DESC
        LIMIT 100`
    );

    return NextResponse.json({ ok: true, movimientos, reversiones });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg, movimientos: [], reversiones: [] }, { status: 500 });
  }
}
