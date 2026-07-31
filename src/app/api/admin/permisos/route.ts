import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Devuelve la matriz rol × permiso para el panel de administración.
export async function GET() {
  const err = await guardPermiso("PANEL_ROLES");
  if (err) return err;

  try {
    // `ambito` (F0_018) separa los permisos del bot de los del panel.
    const permisos = await query<{ clave: string; descripcion: string | null; ambito: string }>(
      `SELECT clave, descripcion, COALESCE(ambito, 'BOT') AS ambito
         FROM permisos ORDER BY COALESCE(ambito,'BOT') DESC, COALESCE(orden, 0), clave`
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
