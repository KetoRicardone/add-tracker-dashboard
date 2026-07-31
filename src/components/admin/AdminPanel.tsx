"use client";

import { useSearchParams } from "next/navigation";
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
  precargas: PrecargaAdminData["precargas"];
  establecimientos: Establecimiento[];
  granos: Grano[];
  campos: CampoCalidad[];
}

type Tab = "usuarios" | "permisos" | "precintos" | "establecimientos" | "granos";

const TIPOS_ESTABLECIMIENTO = ["Propio", "Proveedor", "Cliente"];

// La sección se elige desde el submenú lateral (/admin?tab=...); acá solo se renderiza.
export function AdminPanel({ data }: { data: AdminData }) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab | null) || "usuarios";

  switch (tab) {
    case "permisos":
      return <PermisosMatrix permisos={data.permisos} roles={data.roles} rolPermisos={data.rolPermisos} />;
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
