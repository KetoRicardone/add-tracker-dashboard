import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Anula TODOS los eventos vigentes de una CP (cpe) dentro de una trazabilidad.
// Cada evento queda ANULADO + fila auditada en traz_eventos_anulaciones.
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  let body: { trazabilidad_id?: string; cpe?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const { trazabilidad_id, cpe } = body;
  const motivo = (body.motivo || "").trim();
  if (!trazabilidad_id || !cpe) {
    return NextResponse.json({ ok: false, error: "Falta trazabilidad o CP" }, { status: 400 });
  }
  if (motivo.length < 3) {
    return NextResponse.json({ ok: false, error: "Indicá un motivo (mín. 3 caracteres)" }, { status: 400 });
  }

  const sinCp = cpe.startsWith("__"); // grupo "Sin CP asignada"
  try {
    const count = await withTransaction(async (c) => {
      const evs = await c.query<{ evento_id: string }>(
        sinCp
          ? `SELECT evento_id FROM traz_eventos
             WHERE trazabilidad_id = $1
               AND COALESCE(NULLIF(datos_evento->>'cpe', ''), NULLIF(datos_evento->>'cp_seleccionada', '')) IS NULL
               AND estado_evento NOT IN ('ANULADO', 'SUPERSEDIDO')`
          : `SELECT evento_id FROM traz_eventos
             WHERE trazabilidad_id = $1
               AND (datos_evento->>'cpe' = $2 OR datos_evento->>'cp_seleccionada' = $2)
               AND estado_evento NOT IN ('ANULADO', 'SUPERSEDIDO')`,
        sinCp ? [trazabilidad_id] : [trazabilidad_id, cpe]
      );
      for (const e of evs.rows) {
        await c.query(`UPDATE traz_eventos SET estado_evento = 'ANULADO' WHERE evento_id = $1`, [e.evento_id]);
        const prefijo = sinCp ? "[Anulación de eventos sin CP]" : `[Anulación de CP ${cpe}]`;
        await c.query(
          `INSERT INTO traz_eventos_anulaciones (evento_id, anulado_por_usuario_id, motivo)
           VALUES ($1, $2, $3)`,
          [e.evento_id, sesion.uid, `${prefijo} ${motivo}`]
        );
      }
      return evs.rows.length;
    });

    return NextResponse.json({ ok: true, anulados: count });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
