import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Devuelve la matriz rol × permiso para el panel de administración.
export async function GET() {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });

  try {
    const permisos = await query<{ clave: string; descripcion: string | null }>(
      `SELECT clave, descripcion FROM permisos ORDER BY clave`
    );
    const roles = await query<{ rol: string }>(`SELECT unnest(enum_range(NULL::rol_usuario))::text AS rol`);
    const rolPermisos = await query<{ rol: string; permiso_clave: string }>(
      `SELECT rol::text AS rol, permiso_clave FROM rol_permisos`
    );
    return NextResponse.json({
      ok: true,
      permisos,
      roles: roles.map((r) => r.rol),
      rolPermisos,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Si las tablas RBAC no existen aún (F0_009 no aplicada), degradar.
    return NextResponse.json({ ok: false, error: msg, permisos: [], roles: [], rolPermisos: [] }, { status: 200 });
  }
}
