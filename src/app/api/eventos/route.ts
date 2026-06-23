import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    let q = `SELECT
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
    JOIN traz_trazabilidades t ON t.trazabilidad_id = e.trazabilidad_id`;

    const params: unknown[] = [];

    if (tipo) {
      q += ` WHERE e.tipo_evento = $1`;
      params.push(tipo);
    }

    q += ` ORDER BY e.fecha_hora_evento DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const eventos = await query(q, params);

    return NextResponse.json({ eventos, total: eventos.length });
  } catch (error) {
    console.error("Error fetching eventos:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}
