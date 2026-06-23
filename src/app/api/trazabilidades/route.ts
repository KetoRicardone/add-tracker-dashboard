import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Trazabilidad } from "@/lib/types";
import { EVENT_DEFINITIONS } from "@/lib/events";

export async function GET() {
  try {
    const rows = await query<{
      trazabilidad_id: string;
      codigo_grano: string;
      codigo_establecimiento: string;
      campania: string;
      estado_trazabilidad: string;
      created_at: string;
      eventos: string;
    }>(
      `SELECT
        t.trazabilidad_id,
        t.codigo_grano,
        t.codigo_establecimiento,
        t.campania,
        t.estado_trazabilidad,
        t.created_at,
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'evento_id', e.evento_id,
            'tipo_evento', e.tipo_evento,
            'fecha', e.fecha_hora_evento,
            'resultado', e.resultado,
            'responsable', e.responsable_nombre,
            'datos', e.datos_evento
          ) ORDER BY e.fecha_hora_evento
        ) FILTER (WHERE e.evento_id IS NOT NULL), '[]'::jsonb) AS eventos
      FROM traz_trazabilidades t
      LEFT JOIN traz_eventos e ON e.trazabilidad_id = t.trazabilidad_id
      WHERE t.estado_trazabilidad = 'ABIERTA'
      GROUP BY t.trazabilidad_id
      ORDER BY t.created_at DESC
      LIMIT 50`
    );

    const trazabilidades: Trazabilidad[] = rows.map((r) => {
      const eventos = typeof r.eventos === "string" ? JSON.parse(r.eventos) : r.eventos;
      const tiposRegistrados = new Set(
        Array.isArray(eventos) ? eventos.map((e: { tipo_evento: string }) => e.tipo_evento) : []
      );
      const completados = EVENT_DEFINITIONS.filter((def) =>
        tiposRegistrados.has(def.tipo_evento)
      ).length;

      return {
        trazabilidad_id: r.trazabilidad_id,
        codigo_grano: r.codigo_grano,
        codigo_establecimiento: r.codigo_establecimiento,
        campania: r.campania,
        estado_trazabilidad: r.estado_trazabilidad,
        estado_operacional: null,
        fecha_apertura: r.created_at,
        fecha_cierre: null,
        eventos: Array.isArray(eventos) ? eventos : [],
        progreso: Math.round((completados / EVENT_DEFINITIONS.length) * 100),
        total_eventos: EVENT_DEFINITIONS.length,
        completados,
      };
    });

    return NextResponse.json({ trazabilidades, total: trazabilidades.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Error al obtener trazabilidades", detail: msg },
      { status: 200 }
    );
  }
}
