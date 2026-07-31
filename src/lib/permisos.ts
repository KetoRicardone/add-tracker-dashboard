import { cache } from "react";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin, type Sesion } from "@/lib/auth";

// RBAC del panel web (F0_018). Los permisos viven en la misma tabla que los del
// bot, separados por `ambito`: los de ámbito BOT filtran el menú de Telegram
// (menu_items.permiso_requerido) y los de ámbito PANEL filtran esto.
// Ambos se administran desde /admin?tab=permisos.

export type PermisoPanel =
  | "PANEL_ACCESO"
  | "PANEL_TRAZABILIDAD"
  | "PANEL_EVENTOS"
  | "PANEL_ANULAR"
  | "PANEL_ADMIN"
  | "PANEL_USUARIOS"
  | "PANEL_ROLES"
  | "PANEL_PRECINTOS"
  | "PANEL_ESTABLECIMIENTOS"
  | "PANEL_GRANOS";

// Permisos que NO se le pueden quitar a ADMIN: sin ellos nadie podría volver a
// entrar a la matriz para restaurarlos (candado de sí mismo).
export const PERMISOS_IRREVOCABLES_ADMIN = ["PANEL_ADMIN", "PANEL_ROLES"];

const VER_CON_SESION: PermisoPanel[] = ["PANEL_ACCESO", "PANEL_TRAZABILIDAD", "PANEL_EVENTOS", "PANEL_ANULAR"];
const ADMINISTRAR: PermisoPanel[] = [
  "PANEL_ADMIN", "PANEL_USUARIOS", "PANEL_ROLES",
  "PANEL_PRECINTOS", "PANEL_ESTABLECIMIENTOS", "PANEL_GRANOS",
];

// cache() de React: una sola consulta por request aunque la pregunten el layout,
// la página y la API.
const cargarDeDB = cache(async (rol: string): Promise<Set<string> | null> => {
  try {
    const rows = await query<{ permiso_clave: string }>(
      `SELECT rp.permiso_clave
         FROM rol_permisos rp
         JOIN permisos p ON p.clave = rp.permiso_clave AND p.ambito = 'PANEL'
        WHERE rp.rol = $1::rol_usuario`,
      [rol]
    );
    return new Set(rows.map((r) => r.permiso_clave));
  } catch {
    // F0_018 sin aplicar (o rol fuera del enum) → se degrada abajo.
    return null;
  }
});

/** Permisos de panel efectivos de una sesión. */
export async function permisosPanel(s: Sesion | null): Promise<Set<string>> {
  if (!s) return new Set();
  const guardados = s.rol ? await cargarDeDB(s.rol) : null;
  if (guardados) return guardados;

  // Degradado al control binario previo a F0_018: con sesión se ve el panel,
  // administrar requiere ADMIN/SISTEMAS. Así un deploy anterior a la migración
  // no deja a nadie afuera.
  const base = new Set<string>(VER_CON_SESION);
  if (esAdmin(s)) ADMINISTRAR.forEach((p) => base.add(p));
  return base;
}

/** True si la sesión actual (cookie) tiene el permiso. */
export async function puede(clave: PermisoPanel): Promise<boolean> {
  return (await permisosPanel(getSesion())).has(clave);
}

/** Guard para route handlers: devuelve null si pasa, o la respuesta 401/403. */
export async function guardPermiso(clave: PermisoPanel): Promise<NextResponse | null> {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const permisos = await permisosPanel(s);
  if (!permisos.has(clave)) {
    return NextResponse.json(
      { ok: false, error: `Tu rol (${s.rol || "—"}) no tiene el permiso ${clave}` },
      { status: 403 }
    );
  }
  return null;
}
