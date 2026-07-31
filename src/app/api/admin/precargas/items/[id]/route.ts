import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// PATCH: Editar numero_precinto (correccion de error OCR)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sinPermiso = await guardPermiso("PANEL_PRECINTOS");
  if (sinPermiso) return sinPermiso;

  let body: { numero_precinto?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Body invalido" }, { status: 400 });
  }

  const nuevoNumero = (body.numero_precinto || "").trim();
  if (!nuevoNumero || nuevoNumero.length < 1) {
    return NextResponse.json({ ok: false, error: "Numero de precinto invalido" }, { status: 400 });
  }

  try {
    await withTransaction(async (c) => {
      const orig = await c.query<{ estado: string; numero_precinto: string }>(
        `SELECT estado, numero_precinto FROM traz_precarga_items WHERE item_id = $1`, [params.id]
      );
      const o = orig.rows[0];
      if (!o) throw new Error("Item inexistente");
      if (o.estado === "DESCARTADO") throw new Error("Item ya descartado");

      await c.query(
        `UPDATE traz_precarga_items SET numero_precinto = $2, estado = 'EDITADO' WHERE item_id = $1 AND estado <> 'DESCARTADO'`,
        [params.id, nuevoNumero]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// DELETE: Marcar item como DESCARTADO (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const sinPermiso = await guardPermiso("PANEL_PRECINTOS");
  if (sinPermiso) return sinPermiso;

  try {
    await withTransaction(async (c) => {
      const orig = await c.query<{ estado: string }>(
        `SELECT estado FROM traz_precarga_items WHERE item_id = $1`, [params.id]
      );
      if (!orig.rows[0]) throw new Error("Item inexistente");

      await c.query(
        `UPDATE traz_precarga_items SET estado = 'DESCARTADO' WHERE item_id = $1 AND estado <> 'DESCARTADO'`,
        [params.id]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
