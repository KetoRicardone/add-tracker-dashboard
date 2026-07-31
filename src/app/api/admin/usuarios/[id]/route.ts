import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion } from "@/lib/auth";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";

async function guard() {
  const err = await guardPermiso("PANEL_USUARIOS");
  return { err, s: err ? null : getSesion() };
}

// Edita rol / activo / bloqueado / pin_bloqueado de un usuario.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, s } = await guard();
  if (err) return err;

  let body: { rol?: string; activo?: boolean; bloqueado?: boolean; pin_bloqueado?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  // Evitar que un admin se quite el propio acceso por error.
  if (s && s.uid === params.id && (body.activo === false || body.bloqueado === true)) {
    return NextResponse.json({ ok: false, error: "No podés desactivar/bloquear tu propio usuario" }, { status: 400 });
  }

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (body.rol !== undefined) { sets.push(`rol = $${i++}::rol_usuario`); vals.push(body.rol); }
  if (body.activo !== undefined) { sets.push(`activo = $${i++}`); vals.push(!!body.activo); }
  if (body.bloqueado !== undefined) { sets.push(`bloqueado = $${i++}`); vals.push(!!body.bloqueado); }
  if (body.pin_bloqueado !== undefined) { sets.push(`pin_bloqueado = $${i++}`); vals.push(!!body.pin_bloqueado); }
  if (!sets.length) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }
  vals.push(params.id);

  try {
    const res = await query(`UPDATE usuarios SET ${sets.join(", ")} WHERE usuario_id = $${i}`, vals);
    return NextResponse.json({ ok: true, updated: (res as unknown as { length: number }).length ?? 1 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
