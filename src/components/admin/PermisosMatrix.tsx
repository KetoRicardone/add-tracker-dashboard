"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Permiso {
  clave: string;
  descripcion: string | null;
}
export interface RolPermiso {
  rol: string;
  permiso_clave: string;
}

const key = (rol: string, permiso: string) => `${rol}|${permiso}`;

export function PermisosMatrix({
  permisos,
  roles,
  rolPermisos,
}: {
  permisos: Permiso[];
  roles: string[];
  rolPermisos: RolPermiso[];
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
        No hay permisos definidos. Aplicá la migración <code>F0_009_rbac_menu.sql</code>.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tildá qué <b>permisos</b> tiene cada <b>rol</b>. El menú del bot y el acceso se filtran por esto en tiempo real.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
            {permisos.map((p) => (
              <tr key={p.clave}>
                <td className="px-3 py-2">
                  <div className="font-mono text-xs font-semibold">{p.clave}</div>
                  {p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}
                </td>
                {roles.map((r) => {
                  const k = key(r, p.clave);
                  const on = granted.has(k);
                  return (
                    <td key={r} className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggle(r, p.clave)}
                        disabled={busy === k}
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50"
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
    </div>
  );
}
