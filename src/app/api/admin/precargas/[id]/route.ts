import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DELETE: Descartar precarga entera (marca todos sus items como DESCARTADO)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  try {
    await withTransaction(async (c) => {
      const orig = await c.query<{ estado: string }>(
        `SELECT estado FROM traz_precarga_ocr WHERE precarga_id = $1`, [params.id]
      );
      if (!orig.rows[0]) throw new Error("Precarga inexistente");

      await c.query(
        `UPDATE traz_precarga_ocr SET estado = 'DESCARTADO' WHERE precarga_id = $1`,
        [params.id]
      );
      await c.query(
        `UPDATE traz_precarga_items SET estado = 'DESCARTADO' WHERE precarga_id = $1 AND estado <> 'DESCARTADO'`,
        [params.id]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
