import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [traz] = await query<{
      trazabilidad_id: string;
      codigo_grano: string;
      codigo_establecimiento: string;
      campania: string;
      estado_trazabilidad: string;
      created_at: string;
    }>(
      `SELECT trazabilidad_id, codigo_grano, codigo_establecimiento,
              campania, estado_trazabilidad, created_at
       FROM traz_trazabilidades
       WHERE trazabilidad_id = $1`,
      [id]
    );

    if (!traz) {
      return NextResponse.json({ error: "Trazabilidad no encontrada" }, { status: 404 });
    }

    const eventos = await query<{
      evento_id: string;
      tipo_evento: string;
      fecha: string;
      resultado: string;
      responsable: string;
      datos: Record<string, unknown>;
    }>(
      `SELECT
        e.evento_id,
        e.tipo_evento,
        e.fecha_hora_evento AS fecha,
        e.resultado,
        e.responsable_nombre AS responsable,
        e.datos_evento AS datos
      FROM traz_eventos e
      WHERE e.trazabilidad_id = $1
      ORDER BY e.fecha_hora_evento`,
      [id]
    );

    return NextResponse.json({
      ...traz,
      estado_operacional: null,
      fecha_apertura: traz.created_at,
      fecha_cierre: null,
      eventos,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error al obtener detalle", detail: msg },
      { status: 200 }
    );
  }
}
