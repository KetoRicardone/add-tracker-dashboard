import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface CpDisponible {
  trazabilidad_id: string;
  codigo_grano: string;
  codigo_establecimiento: string;
  campania: string;
  cpe: string | null;
}

// GET: Cartas de Porte con OCR y sin precarga confirmada — candidatas para
// vincular una precarga sin CP. Misma logica que el selector del bot
// (SWF_PRECARGA_PRECINTO ▸ DB ▸ Query CPs Pendientes).
export async function GET() {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    const cps = await query<CpDisponible>(
      `SELECT
         o.trazabilidad_id,
         t.codigo_grano,
         t.codigo_establecimiento,
         t.campania,
         o.datos_evento->>'cpe' AS cpe
       FROM traz_eventos o
       JOIN traz_trazabilidades t ON t.trazabilidad_id = o.trazabilidad_id
       WHERE o.tipo_evento = 'EV_OCR_CARTA_PORTE'
         AND NOT EXISTS (
           SELECT 1 FROM traz_precarga_ocr p
           WHERE p.trazabilidad_id = o.trazabilidad_id
             AND p.cpe = o.datos_evento->>'cpe'
             AND p.estado = 'CONFIRMADO'
         )
         AND t.estado_trazabilidad = 'ABIERTA'
       ORDER BY o.created_at DESC`
    );
    return NextResponse.json({ ok: true, cps });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
