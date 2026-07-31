import { getSesion } from "@/lib/auth";
import { permisosPanel } from "@/lib/permisos";
import { query } from "@/lib/db";
import { AdminPanel, AdminData } from "@/components/admin/AdminPanel";
import { Usuario } from "@/components/admin/UsuariosTab";
import { Permiso, RolPermiso } from "@/components/admin/PermisosMatrix";
import { Establecimiento } from "@/components/admin/EstablecimientosTab";
import { Grano, CampoCalidad } from "@/components/admin/GranosTab";
import type { Precarga, PrecargaItem } from "@/lib/types";
import { ShieldAlert, Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Solo se consulta lo que el rol puede ver: sin el permiso, la pestaña ni se
// ofrece y los datos nunca salen de la base.
async function loadData(permisos: Set<string>): Promise<AdminData> {
  const vacio: AdminData = {
    usuarios: [], roles: [], permisos: [], rolPermisos: [], menuPorPermiso: {},
    precargas: [], establecimientos: [], granos: [], campos: [], permisosPanel: Array.from(permisos),
  };

  if (permisos.has("PANEL_USUARIOS")) Object.assign(vacio, await loadUsuarios());
  if (permisos.has("PANEL_ROLES")) Object.assign(vacio, await loadRoles());
  if (permisos.has("PANEL_PRECINTOS")) Object.assign(vacio, await loadPrecargas());
  if (permisos.has("PANEL_ESTABLECIMIENTOS")) Object.assign(vacio, await loadEstablecimientos());
  if (permisos.has("PANEL_GRANOS")) Object.assign(vacio, await loadGranos());

  // UsuariosTab necesita la lista de roles aunque no se administre la matriz.
  if (!vacio.roles.length && permisos.has("PANEL_USUARIOS")) {
    vacio.roles = (await query<{ rol: string }>(`SELECT unnest(enum_range(NULL::rol_usuario))::text AS rol`))
      .map((r) => r.rol);
  }
  return vacio;
}

async function loadUsuarios() {
  const usuarios = await query<Usuario>(
    `SELECT usuario_id, nombre, telegram_id::text AS telegram_id, rol::text AS rol,
            COALESCE(activo, true) AS activo,
            COALESCE(bloqueado, false) AS bloqueado,
            COALESCE(pin_bloqueado, false) AS pin_bloqueado,
            COALESCE(requiere_cambio_pin, false) AS requiere_cambio_pin,
            (clave_firma_hash IS NOT NULL) AS tiene_pin,
            ultimo_acceso, creado_en
     FROM usuarios
     ORDER BY nombre`
  );
  return { usuarios };
}

async function loadRoles() {
  const rolesRows = await query<{ rol: string }>(`SELECT unnest(enum_range(NULL::rol_usuario))::text AS rol`);
  const roles = rolesRows.map((r) => r.rol);

  let permisos: Permiso[] = [];
  let rolPermisos: RolPermiso[] = [];
  let menuPorPermiso: Record<string, string> = {};
  try {
    // `ambito` (F0_018) separa los permisos del bot de los del panel.
    permisos = await query<Permiso>(
      `SELECT clave, descripcion, COALESCE(ambito, 'BOT') AS ambito
         FROM permisos ORDER BY COALESCE(ambito,'BOT') DESC, COALESCE(orden, 0), clave`
    );
    rolPermisos = await query<RolPermiso>(`SELECT rol::text AS rol, permiso_clave FROM rol_permisos`);
  } catch {
    // F0_009 no aplicada todavia → la matriz muestra el aviso.
  }
  try {
    // Qué botones del bot apaga cada permiso, para que la matriz se entienda sola.
    const filas = await query<{ permiso_requerido: string; items: string }>(
      `SELECT permiso_requerido, string_agg(label, ' · ' ORDER BY orden) AS items
         FROM menu_items WHERE activo AND permiso_requerido IS NOT NULL
        GROUP BY permiso_requerido`
    );
    menuPorPermiso = Object.fromEntries(filas.map((f) => [f.permiso_requerido, f.items]));
  } catch {
    /* menu_items opcional */
  }
  return { roles, permisos, rolPermisos, menuPorPermiso };
}

async function loadPrecargas() {
  let precargas: Precarga[] = [];
  try {
    const rows = await query<Precarga & { items_json: string }>(
      `SELECT p.*, COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'item_id', i.item_id, 'precarga_id', i.precarga_id,
          'numero_precinto', i.numero_precinto, 'orden', i.orden,
          'peso_kg', i.peso_kg, 'estado', i.estado,
          'peso_corregido', i.peso_corregido, 'created_at', i.created_at
        ) ORDER BY i.orden)
         FROM traz_precarga_items i WHERE i.precarga_id = p.precarga_id),
        '[]'::jsonb
      )::text AS items_json
       FROM traz_precarga_ocr p
       ORDER BY p.created_at DESC
       LIMIT 100`
    );
    precargas = rows.map((r) => ({
      ...r,
      items: JSON.parse(r.items_json || "[]") as PrecargaItem[],
    }));
  } catch {
    // F0_010 no aplicada todavia.
  }
  return { precargas };
}

// Maestro de establecimientos (F0_017).
async function loadEstablecimientos() {
  let establecimientos: Establecimiento[] = [];
  try {
    establecimientos = await query<Establecimiento>(
      `SELECT e.codigo, e.nombre, e.tipo, e.observaciones,
              (e.vigente_hasta IS NULL OR e.vigente_hasta > now()) AS vigente,
              (SELECT count(*) FROM traz_trazabilidades t WHERE t.codigo_establecimiento = e.codigo) AS usos
       FROM establecimientos e ORDER BY e.nombre`
    );
  } catch {
    // F0_017 no aplicada todavía.
  }
  return { establecimientos };
}

// Maestro de granos + campos de calidad de RGAN-39 (F0_016).
async function loadGranos() {
  let granos: Grano[] = [];
  let campos: CampoCalidad[] = [];
  try {
    granos = await query<Grano>(
      `SELECT g.codigo, g.nombre, g.vida_util_meses, g.observaciones,
              (g.vigente_hasta IS NULL OR g.vigente_hasta > now()) AS vigente,
              (SELECT count(*) FROM granos_campos_calidad c WHERE c.codigo_grano = g.codigo) AS campos,
              (SELECT count(*) FROM traz_trazabilidades t WHERE t.codigo_grano = g.codigo) AS usos
       FROM granos g ORDER BY g.nombre`
    );
    campos = await query<CampoCalidad>(
      `SELECT codigo_grano, orden, campo_key, etiqueta, suma_caida
         FROM granos_campos_calidad ORDER BY codigo_grano, orden`
    );
  } catch {
    // F0_016 no aplicada todavía.
  }
  return { granos, campos };
}

export default async function AdminPage() {
  const sesion = getSesion();

  if (!sesion) {
    return (
      <Aviso titulo="Iniciá sesión" detalle="Necesitás iniciar sesión (arriba a la derecha) con un usuario administrador para gestionar usuarios y permisos." />
    );
  }
  const permisos = await permisosPanel(sesion);
  if (!permisos.has("PANEL_ADMIN")) {
    return (
      <Aviso
        titulo="Acceso restringido"
        detalle={`Tu rol (${sesion.rol || "—"}) no tiene el permiso PANEL_ADMIN. Un administrador puede activarlo en Administración → Roles.`}
      />
    );
  }

  const data = await loadData(permisos);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-2xl">
            <Settings2 className="h-6 w-6 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Usuarios, roles y permisos — controla el acceso al bot y al dashboard.
            </p>
          </div>
        </div>
      </div>

      <AdminPanel data={data} />
    </div>
  );
}

function Aviso({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-secondary p-4">
        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{detalle}</p>
    </div>
  );
}
