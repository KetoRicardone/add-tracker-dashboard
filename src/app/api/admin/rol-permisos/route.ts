import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { guardPermiso, PERMISOS_IRREVOCABLES_ADMIN } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Concede (conceder=true) o revoca un permiso a un rol. Escribe rol_permisos.
export async function POST(req: NextRequest) {
  const err = await guardPermiso("PANEL_ROLES");
  if (err) return err;

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
  // Candado anti-encierro: sin PANEL_ADMIN/PANEL_ROLES en el rol ADMIN nadie
  // podría volver a esta matriz para restaurar nada.
  if (!conceder && rol === "ADMIN" && PERMISOS_IRREVOCABLES_ADMIN.includes(permiso_clave)) {
    return NextResponse.json(
      { ok: false, error: `${permiso_clave} no se le puede quitar a ADMIN: nadie podría volver a entrar a esta pantalla` },
      { status: 409 }
    );
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
