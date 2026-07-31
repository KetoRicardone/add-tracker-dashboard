import { getSesion, esAdmin } from "@/lib/auth";
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

async function loadData(): Promise<AdminData> {
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
  const rolesRows = await query<{ rol: string }>(`SELECT unnest(enum_range(NULL::rol_usuario))::text AS rol`);
  const roles = rolesRows.map((r) => r.rol);

  let permisos: Permiso[] = [];
  let rolPermisos: RolPermiso[] = [];
  try {
    permisos = await query<Permiso>(`SELECT clave, descripcion FROM permisos ORDER BY clave`);
    rolPermisos = await query<RolPermiso>(`SELECT rol::text AS rol, permiso_clave FROM rol_permisos`);
  } catch {
    // F0_009 no aplicada todavia → la matriz muestra el aviso.
  }

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

  // Maestros: establecimientos (F0_017) y granos + campos de calidad (F0_016).
  let establecimientos: Establecimiento[] = [];
  let granos: Grano[] = [];
  let campos: CampoCalidad[] = [];
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

  return { usuarios, roles, permisos, rolPermisos, precargas, establecimientos, granos, campos };
}

export default async function AdminPage() {
  const sesion = getSesion();

  if (!sesion) {
    return (
      <Aviso titulo="Iniciá sesión" detalle="Necesitás iniciar sesión (arriba a la derecha) con un usuario administrador para gestionar usuarios y permisos." />
    );
  }
  if (!esAdmin(sesion)) {
    return (
      <Aviso titulo="Acceso restringido" detalle={`Tu rol (${sesion.rol || "—"}) no tiene acceso a la administración. Requiere ADMIN o SISTEMAS.`} />
    );
  }

  const data = await loadData();

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
