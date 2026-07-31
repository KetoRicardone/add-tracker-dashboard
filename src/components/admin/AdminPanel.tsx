"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { UsuariosTab, Usuario } from "./UsuariosTab";
import { PermisosMatrix, Permiso, RolPermiso } from "./PermisosMatrix";
import { PrecintosTab, PrecargaAdminData } from "./PrecintosTab";
import { EstablecimientosTab, Establecimiento } from "./EstablecimientosTab";
import { GranosTab, Grano, CampoCalidad } from "./GranosTab";

export interface AdminData {
  usuarios: Usuario[];
  roles: string[];
  permisos: Permiso[];
  rolPermisos: RolPermiso[];
  menuPorPermiso: Record<string, string>;
  precargas: PrecargaAdminData["precargas"];
  establecimientos: Establecimiento[];
  granos: Grano[];
  campos: CampoCalidad[];
  permisosPanel: string[];
}

type Tab = "usuarios" | "permisos" | "precintos" | "establecimientos" | "granos";

const TIPOS_ESTABLECIMIENTO = ["Propio", "Proveedor", "Cliente"];

// Cada pestaña exige su permiso de ámbito PANEL (F0_018).
const PERMISO_TAB: Record<Tab, string> = {
  usuarios: "PANEL_USUARIOS",
  permisos: "PANEL_ROLES",
  precintos: "PANEL_PRECINTOS",
  establecimientos: "PANEL_ESTABLECIMIENTOS",
  granos: "PANEL_GRANOS",
};
const ORDEN: Tab[] = ["usuarios", "permisos", "precintos", "establecimientos", "granos"];

// La sección se elige desde el submenú lateral (/admin?tab=...); acá solo se renderiza.
export function AdminPanel({ data }: { data: AdminData }) {
  const searchParams = useSearchParams();
  const permitidas = ORDEN.filter((t) => data.permisosPanel.includes(PERMISO_TAB[t]));
  const pedida = (searchParams.get("tab") as Tab | null) || permitidas[0] || "usuarios";

  if (!permitidas.includes(pedida)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <ShieldAlert className="mb-3 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Sección restringida</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Tu rol no tiene el permiso <code className="font-mono">{PERMISO_TAB[pedida]}</code>.
        </p>
      </div>
    );
  }

  switch (pedida) {
    case "permisos":
      return (
        <PermisosMatrix
          permisos={data.permisos}
          roles={data.roles}
          rolPermisos={data.rolPermisos}
          menuPorPermiso={data.menuPorPermiso}
        />
      );
    case "precintos":
      return <PrecintosTab data={{ precargas: data.precargas }} />;
    case "establecimientos":
      return <EstablecimientosTab establecimientos={data.establecimientos} tipos={TIPOS_ESTABLECIMIENTO} />;
    case "granos":
      return <GranosTab granos={data.granos} campos={data.campos} />;
    default:
      return <UsuariosTab usuarios={data.usuarios} roles={data.roles} />;
  }
}
