"use client";

import { useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { UsuariosTab, Usuario } from "./UsuariosTab";
import { PermisosMatrix, Permiso, RolPermiso } from "./PermisosMatrix";

export interface AdminData {
  usuarios: Usuario[];
  roles: string[];
  permisos: Permiso[];
  rolPermisos: RolPermiso[];
}

export function AdminPanel({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<"usuarios" | "permisos">("usuarios");

  const tabs = [
    { id: "usuarios" as const, label: "Usuarios", icon: Users, count: data.usuarios.length },
    { id: "permisos" as const, label: "Roles y permisos", icon: ShieldCheck, count: data.permisos.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[10px]", tab === t.id ? "bg-primary-foreground/20" : "bg-secondary")}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "usuarios" ? (
        <UsuariosTab usuarios={data.usuarios} roles={data.roles} />
      ) : (
        <PermisosMatrix permisos={data.permisos} roles={data.roles} rolPermisos={data.rolPermisos} />
      )}
    </div>
  );
}
