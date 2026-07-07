"use client";

import { useSearchParams } from "next/navigation";
import { UsuariosTab, Usuario } from "./UsuariosTab";
import { PermisosMatrix, Permiso, RolPermiso } from "./PermisosMatrix";
import { PrecintosTab, PrecargaAdminData } from "./PrecintosTab";

export interface AdminData {
  usuarios: Usuario[];
  roles: string[];
  permisos: Permiso[];
  rolPermisos: RolPermiso[];
  precargas: PrecargaAdminData["precargas"];
}

type Tab = "usuarios" | "permisos" | "precintos";

// La sección se elige desde el submenú lateral (/admin?tab=...); acá solo se renderiza.
export function AdminPanel({ data }: { data: AdminData }) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab | null) || "usuarios";

  return tab === "permisos" ? (
    <PermisosMatrix permisos={data.permisos} roles={data.roles} rolPermisos={data.rolPermisos} />
  ) : tab === "precintos" ? (
    <PrecintosTab data={{ precargas: data.precargas }} />
  ) : (
    <UsuariosTab usuarios={data.usuarios} roles={data.roles} />
  );
}
