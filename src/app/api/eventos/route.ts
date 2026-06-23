import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Evita que Next cachee la respuesta en build: siempre consulta la BD en vivo.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const eventos = await query<{
      evento_id: string;
      tipo_evento: string;
      fecha: string;
      resultado: string;
      responsable: string;
      trazabilidad_id: string;
      codigo_grano: string;
      campania: string;
      datos: Record<string, unknown>;
    }>(
      `SELECT
        e.evento_id,
        e.tipo_evento,
        e.fecha_hora_evento AS fecha,
        e.resultado,
        e.responsable_nombre AS responsable,
        e.trazabilidad_id,
        t.codigo_grano,
        t.campania,
        e.datos_evento AS datos
      FROM traz_eventos e
      JOIN traz_trazabilidades t ON t.trazabilidad_id = e.trazabilidad_id
      ORDER BY e.fecha_hora_evento DESC
      LIMIT 200`
    );

    return NextResponse.json(
      { eventos, total: eventos.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error al obtener eventos", detail: msg },
      { status: 200 }
    );
  }
}
