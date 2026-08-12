import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Anula un evento (ADR-009): marca estado_evento='ANULADO' (la fila NO se borra)
// y registra el actor + motivo en traz_eventos_anulaciones.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sinPermiso = await guardPermiso("PANEL_ANULAR");
  if (sinPermiso) return sinPermiso;

  let motivo = "";
  try {
    motivo = (await req.json()).motivo?.trim() || "";
  } catch {
    /* sin body */
  }
  if (motivo.length < 3) {
    return NextResponse.json({ ok: false, error: "Indicá un motivo (mín. 3 caracteres)" }, { status: 400 });
  }

  try {
    const resultado = await withTransaction(async (c) => {
      const upd = await c.query(
        `UPDATE traz_eventos
         SET estado_evento = 'ANULADO'
         WHERE evento_id = $1 AND estado_evento NOT IN ('ANULADO', 'SUPERSEDIDO')`,
        [params.id]
      );
      if (upd.rowCount === 0) return { anuladas: 0, revertido: null as string | null };
      await c.query(
        `INSERT INTO traz_eventos_anulaciones (evento_id, anulado_por_usuario_id, motivo)
         VALUES ($1, $2, $3)`,
        [params.id, sesion.uid, motivo]
      );

      // Si el evento movió el estado operacional del lote (ej. RGAN-41 →
      // EN_PROCESAMIENTO), anularlo tiene que devolver el lote a donde estaba.
      // Si no, el lote queda "en proceso" sin ningún evento vivo que lo sostenga
      // y no se puede rehacer la carga.
      const tr = await c.query<{ trazabilidad_id: string; estado_anterior: string | null; estado_nuevo: string; tipo_evento: string | null }>(
        `SELECT trazabilidad_id, estado_anterior, estado_nuevo, tipo_evento
           FROM traz_transiciones WHERE evento_disparador_id = $1
          ORDER BY fecha_hora LIMIT 1`,
        [params.id]
      );
      if (tr.rowCount === 0) return { anuladas: upd.rowCount, revertido: null };
      const { trazabilidad_id, estado_anterior, estado_nuevo, tipo_evento } = tr.rows[0];

      // Solo se revierte si ningún otro evento vivo del mismo tipo sostiene el estado.
      const vivos = await c.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM traz_eventos
          WHERE trazabilidad_id = $1 AND tipo_evento::text = $2 AND evento_id <> $3
            AND estado_evento NOT IN ('ANULADO', 'SUPERSEDIDO')`,
        [trazabilidad_id, tipo_evento, params.id]
      );
      if (Number(vivos.rows[0].n) > 0) return { anuladas: upd.rowCount, revertido: null };

      const rev = await c.query(
        `UPDATE traz_trazabilidades
            SET estado_operacional = $2, updated_at = now()
          WHERE trazabilidad_id = $1 AND estado_operacional = $3`,
        [trazabilidad_id, estado_anterior, estado_nuevo]
      );
      if (rev.rowCount === 0) return { anuladas: upd.rowCount, revertido: null };

      // traz_transiciones.estado_nuevo es NOT NULL: la vuelta a un estado nulo
      // (lote que nunca tuvo estado operacional) no se puede asentar acá. En ese
      // caso la traza queda en traz_eventos_anulaciones, que sí lleva actor y motivo.
      if (estado_anterior) {
        await c.query(
          `INSERT INTO traz_transiciones
             (trazabilidad_id, estado_anterior, estado_nuevo, tipo_evento, actor_usuario_id, motivo)
           VALUES ($1, $2, $3, 'EV_ANULACION', $4, $5)`,
          [trazabilidad_id, estado_nuevo, estado_anterior, sesion.uid, `Anulación: ${motivo}`]
        );
      }
      return { anuladas: upd.rowCount, revertido: trazabilidad_id };
    });

    if (resultado.anuladas === 0) {
      return NextResponse.json({ ok: false, error: "Evento inexistente o ya anulado" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, lote_reabierto: resultado.revertido });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
