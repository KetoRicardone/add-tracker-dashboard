"use client";

import { useState } from "react";
import { Loader2, Bot, MonitorSmartphone, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Permiso {
  clave: string;
  descripcion: string | null;
  ambito?: string | null;
}
export interface RolPermiso {
  rol: string;
  permiso_clave: string;
}

const key = (rol: string, permiso: string) => `${rol}|${permiso}`;

// Sin estos permisos nadie podría volver a entrar a esta matriz: la API los
// rechaza para el rol ADMIN y acá se muestran como candado.
const IRREVOCABLES_ADMIN = ["PANEL_ADMIN", "PANEL_ROLES"];

const AMBITOS = [
  {
    id: "BOT",
    titulo: "Bot de Telegram",
    icono: Bot,
    detalle: "Qué botones ve cada rol en el menú del bot. Se aplica en tiempo real, al abrir el menú.",
  },
  {
    id: "PANEL",
    titulo: "Panel web",
    icono: MonitorSmartphone,
    detalle: "Qué secciones del panel puede abrir cada rol. Se aplica al recargar la página.",
  },
];

export function PermisosMatrix({
  permisos,
  roles,
  rolPermisos,
  menuPorPermiso = {},
}: {
  permisos: Permiso[];
  roles: string[];
  rolPermisos: RolPermiso[];
  menuPorPermiso?: Record<string, string>;
}) {
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(rolPermisos.map((rp) => key(rp.rol, rp.permiso_clave)))
  );
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  async function toggle(rol: string, permiso: string) {
    const k = key(rol, permiso);
    const conceder = !granted.has(k);
    // Optimista
    setGranted((prev) => {
      const next = new Set(prev);
      if (conceder) next.add(k);
      else next.delete(k);
      return next;
    });
    setBusy(k);
    setError("");
    try {
      const res = await fetch("/api/admin/rol-permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol, permiso_clave: permiso, conceder }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        // Revertir
        setGranted((prev) => {
          const next = new Set(prev);
          if (conceder) next.delete(k);
          else next.add(k);
          return next;
        });
        setError(d.error || "No se pudo actualizar el permiso");
      }
    } finally {
      setBusy("");
    }
  }

  if (!permisos.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay permisos definidos. Aplicá las migraciones <code>F0_009_rbac_menu.sql</code> y{" "}
        <code>F0_018_permisos_ambito.sql</code>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        El acceso se gestiona en dos partes: lo que cada <b>rol</b> puede hacer en el <b>bot</b> y lo que puede
        hacer en el <b>panel</b>. Tildá para conceder, destildá para quitar.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {AMBITOS.map((a) => {
        const delAmbito = permisos.filter((p) => (p.ambito || "BOT") === a.id);
        if (!delAmbito.length) return null;
        const Icono = a.icono;
        return (
          <section key={a.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icono className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{a.titulo}</h2>
              <span className="text-xs text-muted-foreground">{delAmbito.length} permisos</span>
            </div>
            <p className="text-xs text-muted-foreground">{a.detalle}</p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Permiso</th>
                    {roles.map((r) => (
                      <th key={r} className="px-3 py-2 text-center font-medium">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {delAmbito.map((p) => (
                    <tr key={p.clave}>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs font-semibold">{p.clave}</div>
                        {p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}
                        {menuPorPermiso[p.clave] && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                            Botones: {menuPorPermiso[p.clave]}
                          </div>
                        )}
                      </td>
                      {roles.map((r) => {
                        const k = key(r, p.clave);
                        const on = granted.has(k);
                        const fijo = r === "ADMIN" && IRREVOCABLES_ADMIN.includes(p.clave);
                        if (fijo) {
                          return (
                            <td key={r} className="px-3 py-2 text-center">
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded border border-primary/40 bg-primary/15 text-primary"
                                title="ADMIN no puede perder este permiso: nadie podría volver a entrar acá"
                              >
                                <Lock className="h-3 w-3" />
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={r} className="px-3 py-2 text-center">
                            <button
                              onClick={() => toggle(r, p.clave)}
                              disabled={busy === k}
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary/50"
                              )}
                              title={on ? `Quitar ${p.clave} a ${r}` : `Dar ${p.clave} a ${r}`}
                            >
                              {busy === k ? <Loader2 className="h-3 w-3 animate-spin" /> : on ? "✓" : ""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
