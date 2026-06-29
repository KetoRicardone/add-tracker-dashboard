import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH: Corregir peso_kg de un precinto (con trazabilidad de auditoria)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  let body: { peso_kg?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Body invalido" }, { status: 400 });
  }

  if (body.peso_kg == null || typeof body.peso_kg !== "number" || body.peso_kg < 0) {
    return NextResponse.json({ ok: false, error: "Peso invalido (debe ser numero >= 0)" }, { status: 400 });
  }

  try {
    await withTransaction(async (c) => {
      const orig = await c.query<{ estado: string; peso_kg: number }>(
        `SELECT estado, peso_kg FROM traz_precarga_items WHERE item_id = $1`, [params.id]
      );
      if (!orig.rows[0]) throw new Error("Item inexistente");
      if (orig.rows[0].estado === "DESCARTADO") throw new Error("Item ya descartado");

      await c.query(
        `UPDATE traz_precarga_items SET peso_kg = $2, peso_corregido = true WHERE item_id = $1 AND estado <> 'DESCARTADO'`,
        [params.id, body.peso_kg]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
