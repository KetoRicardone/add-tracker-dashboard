import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { getSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST: Vincular una precarga SIN CP a una Carta de Porte (trazabilidad_id + cpe).
// Misma operacion que hace el bot (SWF_PRECARGA_PRECINTO ▸ DB ▸ Update Vincular
// Precarga), con la guarda `trazabilidad_id IS NULL` para resolver la carrera
// (si otro usuario/operario ya la vinculo, este UPDATE afecta 0 filas).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

  let body: { trazabilidad_id?: string; cpe?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body invalido" }, { status: 400 });
  }

  const trazabilidadId = (body.trazabilidad_id || "").trim();
  if (!trazabilidadId) {
    return NextResponse.json({ ok: false, error: "Falta trazabilidad_id" }, { status: 400 });
  }
  const cpe = body.cpe && String(body.cpe).trim() !== "" ? String(body.cpe).trim() : null;

  try {
    const afectadas = await withTransaction(async (c) => {
      const orig = await c.query<{ estado: string; trazabilidad_id: string | null }>(
        `SELECT estado, trazabilidad_id FROM traz_precarga_ocr WHERE precarga_id = $1`,
        [params.id]
      );
      if (!orig.rows[0]) throw new Error("Precarga inexistente");
      if (orig.rows[0].estado === "DESCARTADO") throw new Error("La precarga esta descartada");
      if (orig.rows[0].trazabilidad_id) throw new Error("La precarga ya tiene una CP asignada");

      const res = await c.query(
        `UPDATE traz_precarga_ocr
           SET trazabilidad_id = $2,
               cpe = $3,
               vinculado_en = now(),
               vinculado_por = $4
         WHERE precarga_id = $1
           AND trazabilidad_id IS NULL`,
        [params.id, trazabilidadId, cpe, sesion.uid]
      );
      return res.rowCount ?? 0;
    });

    if (afectadas === 0) {
      return NextResponse.json(
        { ok: false, error: "La precarga ya fue vinculada mientras tanto." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
