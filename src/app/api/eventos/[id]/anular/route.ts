import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Anula un evento (ADR-009): marca estado_evento='ANULADO' (la fila NO se borra)
// y registra el actor + motivo en traz_eventos_anulaciones.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

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
    const anuladas = await withTransaction(async (c) => {
      const upd = await c.query(
        `UPDATE traz_eventos
         SET estado_evento = 'ANULADO'
         WHERE evento_id = $1 AND estado_evento NOT IN ('ANULADO', 'SUPERSEDIDO')`,
        [params.id]
      );
      if (upd.rowCount === 0) return 0;
      await c.query(
        `INSERT INTO traz_eventos_anulaciones (evento_id, anulado_por_usuario_id, motivo)
         VALUES ($1, $2, $3)`,
        [params.id, sesion.uid, motivo]
      );
      return upd.rowCount;
    });

    if (anuladas === 0) {
      return NextResponse.json({ ok: false, error: "Evento inexistente o ya anulado" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
