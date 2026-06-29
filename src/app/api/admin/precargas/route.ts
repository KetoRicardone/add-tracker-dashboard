import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import type { Precarga, PrecargaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    let precargas: Precarga[] = [];
    try {
      const rows = await query<Precarga & { items_json: string }>(
        `SELECT p.*, COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'item_id', i.item_id, 'precarga_id', i.precarga_id,
            'numero_precinto', i.numero_precinto, 'orden', i.orden,
            'peso_kg', i.peso_kg, 'estado', i.estado,
            'peso_corregido', i.peso_corregido, 'created_at', i.created_at
          ) ORDER BY i.orden)
           FROM traz_precarga_items i WHERE i.precarga_id = p.precarga_id),
          '[]'::jsonb
        )::text AS items_json
         FROM traz_precarga_ocr p
         ORDER BY p.created_at DESC
         LIMIT 100`
      );
      precargas = rows.map((r) => ({
        ...r,
        items: JSON.parse(r.items_json || "[]") as PrecargaItem[],
      }));
    } catch {
      return NextResponse.json({ error: "Tabla no disponible (F0_010 no aplicada)" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, precargas });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
