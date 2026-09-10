"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { UsuariosTab, Usuario } from "./UsuariosTab";
import { PermisosMatrix, Permiso, RolPermiso } from "./PermisosMatrix";
import { PrecintosTab, PrecargaAdminData } from "./PrecintosTab";
import { EstablecimientosTab, Establecimiento } from "./EstablecimientosTab";
import { GranosTab, Grano, CampoCalidad } from "./GranosTab";
import { BotonAyuda } from "@/components/Ayuda";

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

// Título y tema de ayuda de cada pestaña. Hasta ahora la única pista de en qué
// pestaña estabas era el resaltado del menú lateral; el encabezado lo dice.
const CABECERA: Record<Tab, { titulo: string; tema: string; detalle: string }> = {
  usuarios: {
    titulo: "Usuarios",
    tema: "adminUsuarios",
    detalle: "Quién usa el bot y el panel, con qué rol, y el manejo de sus PIN",
  },
  permisos: {
    titulo: "Roles y permisos",
    tema: "adminRoles",
    detalle: "Qué puede hacer cada rol en el bot y en el panel",
  },
  precintos: {
    titulo: "Precintos",
    tema: "adminPrecintos",
    detalle: "Precargas por foto, corrección de pesos y vínculo con la Carta de Porte",
  },
  establecimientos: {
    titulo: "Establecimientos",
    tema: "adminEstablecimientos",
    detalle: "El maestro de campos de origen que normaliza la Carta de Porte",
  },
  granos: {
    titulo: "Granos",
    tema: "adminGranos",
    detalle: "Códigos, límite de humedad y campos de calidad por grano",
  },
};

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

  const cab = CABECERA[pedida];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{cab.titulo}</h2>
        <BotonAyuda tema={cab.tema} tamano="sm" />
        <p className="ml-1 hidden text-xs text-muted-foreground sm:block">{cab.detalle}</p>
      </div>
      {contenido(pedida, data)}
    </div>
  );
}

function contenido(pedida: Tab, data: AdminData) {
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
