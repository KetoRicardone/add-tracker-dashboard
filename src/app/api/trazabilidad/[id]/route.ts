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
      estado_operacional: string | null;
      fecha_apertura: string;
      fecha_cierre: string | null;
    }>(
      `SELECT trazabilidad_id, codigo_grano, codigo_establecimiento,
              campania, estado_trazabilidad, estado_operacional,
              fecha_apertura, fecha_cierre
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
      humedad_pct: number | null;
      total_caida_pct: number | null;
      galpon: string | null;
      url_drive: string | null;
      hash_sha256: string | null;
    }>(
      `SELECT
        e.evento_id,
        e.tipo_evento,
        e.fecha_hora_evento AS fecha,
        e.resultado,
        e.responsable_nombre AS responsable,
        e.datos_evento AS datos,
        e.humedad_pct,
        e.total_caida_pct,
        e.galpon,
        d.url_drive,
        d.hash_sha256
      FROM traz_eventos e
      LEFT JOIN documentos d ON d.doc_id = ANY(e.adjuntos_v2)
      WHERE e.trazabilidad_id = $1
      ORDER BY e.fecha_hora_evento`,
      [id]
    );

    return NextResponse.json({ ...traz, eventos });
  } catch (error) {
    console.error("Error fetching trazabilidad detail:", error);
    return NextResponse.json(
      { error: "Error al obtener detalle" },
      { status: 500 }
    );
  }
}
