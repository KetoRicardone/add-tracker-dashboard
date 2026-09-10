import { NextResponse } from "next/server";
import { query, vigenteFilter, tableExists } from "@/lib/db";
import { guardPermiso } from "@/lib/permisos";

// Evita que Next cachee la respuesta en build: siempre consulta la BD en vivo.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventoFila = {
  evento_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  /** NULL en los eventos de planta: no pertenecen a ningún lote. */
  trazabilidad_id: string | null;
  codigo_grano: string | null;
  campania: string | null;
  datos: Record<string, unknown>;
  ambito: "LOTE" | "PLANTA";
  planta_codigo: string | null;
  turno: string | null;
};

export async function GET() {
  const err = await guardPermiso("PANEL_EVENTOS");
  if (err) return err;
  try {
    const vig = await vigenteFilter("e");

    const eventos = await query<EventoFila>(
      `SELECT
        e.evento_id,
        e.tipo_evento::text AS tipo_evento,
        e.fecha_hora_evento AS fecha,
        e.resultado::text AS resultado,
        e.responsable_nombre AS responsable,
        e.trazabilidad_id,
        t.codigo_grano,
        t.campania,
        e.datos_evento AS datos,
        'LOTE' AS ambito,
        NULL::text AS planta_codigo,
        NULL::text AS turno
      FROM traz_eventos e
      JOIN traz_trazabilidades t ON t.trazabilidad_id = e.trazabilidad_id
      WHERE 1=1${vig}
      ORDER BY e.fecha_hora_evento DESC
      LIMIT 200`
    );

    // Eventos de planta (ADR-001): RGAN-40 y RGAN-80 no cuelgan de un lote, así
    // que no pueden salir del JOIN de arriba. Se traen aparte y se intercalan
    // por fecha, que es como los lee un operario: la línea de tiempo de la
    // planta, no la de un lote.
    let planta: EventoFila[] = [];
    if (await tableExists("traz_eventos_planta")) {
      planta = await query<EventoFila>(
        `SELECT
          p.evento_planta_id AS evento_id,
          p.tipo_evento::text AS tipo_evento,
          p.fecha_hora_evento AS fecha,
          p.resultado::text AS resultado,
          p.responsable_nombre AS responsable,
          NULL::text AS trazabilidad_id,
          NULL::text AS codigo_grano,
          NULL::text AS campania,
          p.datos_evento AS datos,
          'PLANTA' AS ambito,
          p.planta_codigo,
          p.turno
        FROM traz_eventos_planta p
        WHERE p.estado_evento <> 'ANULADO'
          AND p.superseded_by IS NULL
        ORDER BY p.fecha_hora_evento DESC
        LIMIT 200`
      );
    }

    const todos = [...eventos, ...planta].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    return NextResponse.json(
      { eventos: todos, total: todos.length, planta: planta.length },
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
