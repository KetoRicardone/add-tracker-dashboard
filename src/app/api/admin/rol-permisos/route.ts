import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Concede (conceder=true) o revoca un permiso a un rol. Escribe rol_permisos.
export async function POST(req: NextRequest) {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });

  let body: { rol?: string; permiso_clave?: string; conceder?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const { rol, permiso_clave, conceder } = body;
  if (!rol || !permiso_clave) {
    return NextResponse.json({ ok: false, error: "Faltan rol o permiso" }, { status: 400 });
  }

  try {
    if (conceder) {
      await query(
        `INSERT INTO rol_permisos (rol, permiso_clave) VALUES ($1::rol_usuario, $2) ON CONFLICT DO NOTHING`,
        [rol, permiso_clave]
      );
    } else {
      await query(`DELETE FROM rol_permisos WHERE rol = $1::rol_usuario AND permiso_clave = $2`, [rol, permiso_clave]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
