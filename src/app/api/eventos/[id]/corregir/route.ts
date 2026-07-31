import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Corrige un evento (ADR-009): NO edita la fila original (inmutable). Crea un
// evento NUEVO con los datos corregidos, marca el viejo como SUPERSEDIDO con
// superseded_by → nuevo, y deja traza en traz_eventos_anulaciones.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sinPermiso = await guardPermiso("PANEL_ANULAR");
  if (sinPermiso) return sinPermiso;

  let body: { datos?: Record<string, unknown>; resultado?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const motivo = (body.motivo || "").trim();
  if (!body.datos || typeof body.datos !== "object") {
    return NextResponse.json({ ok: false, error: "Faltan datos corregidos" }, { status: 400 });
  }
  if (motivo.length < 3) {
    return NextResponse.json({ ok: false, error: "Indicá un motivo (mín. 3 caracteres)" }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (c) => {
      const orig = await c.query<{
        evento_id: string;
        tipo_evento: string;
        resultado: string;
        trazabilidad_id: string;
        lote_id: string | null;
        estado_evento: string;
        fecha_hora_evento: string;
      }>(
        `SELECT evento_id, tipo_evento, resultado, trazabilidad_id, lote_id, estado_evento, fecha_hora_evento
         FROM traz_eventos WHERE evento_id = $1`,
        [params.id]
      );
      const o = orig.rows[0];
      if (!o) return { code: 404 as const };
      if (o.estado_evento === "ANULADO" || o.estado_evento === "SUPERSEDIDO") {
        return { code: 409 as const };
      }

      // Marca de corrección dentro de los datos (auditoría legible).
      const datos = { ...body.datos, _corregido_de: o.evento_id, _corregido_por: sesion.nombre };

      const ins = await c.query<{ evento_id: string }>(
        `INSERT INTO traz_eventos
           (tipo_evento, resultado, trazabilidad_id, lote_id, datos_evento, responsable_nombre, responsable_usuario_id, estado_evento, fecha_hora_evento)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'CONFIRMADO', $8)
         RETURNING evento_id`,
        [
          o.tipo_evento,
          body.resultado || o.resultado,
          o.trazabilidad_id,
          o.lote_id,
          JSON.stringify(datos),
          sesion.nombre,
          sesion.uid,
          o.fecha_hora_evento,
        ]
      );
      const nuevoId = ins.rows[0].evento_id;

      await c.query(
        `UPDATE traz_eventos SET estado_evento = 'SUPERSEDIDO', superseded_by = $2 WHERE evento_id = $1`,
        [o.evento_id, nuevoId]
      );
      await c.query(
        `INSERT INTO traz_eventos_anulaciones (evento_id, anulado_por_usuario_id, motivo, evento_reemplazo_id)
         VALUES ($1, $2, $3, $4)`,
        [o.evento_id, sesion.uid, motivo, nuevoId]
      );
      return { code: 200 as const, nuevoId };
    });

    if (result.code === 404) return NextResponse.json({ ok: false, error: "Evento inexistente" }, { status: 404 });
    if (result.code === 409) return NextResponse.json({ ok: false, error: "Evento ya anulado/supersedido" }, { status: 409 });
    return NextResponse.json({ ok: true, evento_id: result.nuevoId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
