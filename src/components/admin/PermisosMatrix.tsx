"use client";

import { useMemo, useState } from "react";
import { Loader2, Bot, MonitorSmartphone, Lock, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Permiso {
  clave: string;
  descripcion: string | null;
  ambito?: string | null;
  /** Fase del circuito a la que pertenece (F0_031). Agrupa las filas. */
  grupo?: string | null;
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
    detalle:
      "Qué formulario puede abrir cada rol en el bot. Se aplica en tiempo real: al abrir el menú filtra los botones, y si alguien toca un botón viejo de un mensaje anterior, el dispatch igual lo rechaza.",
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
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const marcar = (k: string, on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });

  const ocupar = (k: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });

  /** Un toggle contra la API. Optimista: pinta primero y revierte si falla. */
  async function aplicar(rol: string, permiso: string, conceder: boolean) {
    const k = key(rol, permiso);
    marcar(k, conceder);
    ocupar(k, true);
    try {
      const res = await fetch("/api/admin/rol-permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol, permiso_clave: permiso, conceder }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        marcar(k, !conceder);
        setError(d.error || "No se pudo actualizar el permiso");
      }
    } catch {
      marcar(k, !conceder);
      setError("No se pudo contactar al servidor");
    } finally {
      ocupar(k, false);
    }
  }

  function toggle(rol: string, permiso: string) {
    setError("");
    aplicar(rol, permiso, !granted.has(key(rol, permiso)));
  }

  /** Toda la fila: dárselo a todos los roles, o quitárselo a todos. */
  async function toggleFila(permiso: Permiso, conceder: boolean) {
    setError("");
    const objetivo = roles.filter((r) => {
      if (r === "ADMIN" && IRREVOCABLES_ADMIN.includes(permiso.clave)) return false; // candado
      return granted.has(key(r, permiso.clave)) !== conceder;
    });
    await Promise.all(objetivo.map((r) => aplicar(r, permiso.clave, conceder)));
  }

  // Agrupación por fase del circuito. El orden lo trae la consulta (permisos.orden),
  // así que acá sólo hay que respetar el orden de aparición.
  const porAmbito = useMemo(() => {
    const out: Record<string, { grupo: string; filas: Permiso[] }[]> = {};
    for (const a of AMBITOS) {
      const grupos: { grupo: string; filas: Permiso[] }[] = [];
      for (const p of permisos.filter((x) => (x.ambito || "BOT") === a.id)) {
        const g = p.grupo || "GENERAL";
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.grupo === g) ultimo.filas.push(p);
        else grupos.push({ grupo: g, filas: [p] });
      }
      out[a.id] = grupos;
    }
    return out;
  }, [permisos]);

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
        hacer en el <b>panel</b>. Tildá para conceder, destildá para quitar. Los botones{" "}
        <b>todos</b> / <b>ninguno</b> de cada fila aplican el cambio a los {roles.length} roles de una vez.
      </p>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {AMBITOS.map((a) => {
        const grupos = porAmbito[a.id] || [];
        if (!grupos.length) return null;
        const total = grupos.reduce((n, g) => n + g.filas.length, 0);
        const Icono = a.icono;
        return (
          <section key={a.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icono className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{a.titulo}</h2>
              <span className="text-xs text-muted-foreground">{total} permisos</span>
            </div>
            <p className="text-xs text-muted-foreground">{a.detalle}</p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Permiso</th>
                    {roles.map((r) => (
                      <th key={r} className="px-3 py-2 text-center font-medium">
                        {r}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-muted-foreground">
                      Toda la fila
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {grupos.map((g) => (
                    <FilasDeGrupo
                      key={g.grupo}
                      grupo={g.grupo}
                      filas={g.filas}
                      roles={roles}
                      granted={granted}
                      busy={busy}
                      menuPorPermiso={menuPorPermiso}
                      onToggle={toggle}
                      onToggleFila={toggleFila}
                    />
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

function FilasDeGrupo({
  grupo,
  filas,
  roles,
  granted,
  busy,
  menuPorPermiso,
  onToggle,
  onToggleFila,
}: {
  grupo: string;
  filas: Permiso[];
  roles: string[];
  granted: Set<string>;
  busy: Set<string>;
  menuPorPermiso: Record<string, string>;
  onToggle: (rol: string, permiso: string) => void;
  onToggleFila: (permiso: Permiso, conceder: boolean) => void;
}) {
  const historico = grupo.startsWith("HISTÓRICOS");
  return (
    <>
      <tr className="bg-secondary/20">
        <td colSpan={roles.length + 2} className="px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {historico && <Archive className="h-3 w-3" />}
            {grupo}
          </span>
        </td>
      </tr>
      {filas.map((p) => {
        const botones = menuPorPermiso[p.clave];
        // El aviso de "no habilita nada" sólo aplica al ámbito BOT: ahí el
        // permiso manda porque alguna fila de menu_items lo nombra en
        // permiso_requerido, así que sin fila no abre ningún botón (el caso de
        // PROCESO y CALIDAD tras F0_031).
        //
        // Los PANEL_* no viven en menu_items y nunca van a estar: gobiernan
        // secciones del panel desde el código (guardPermiso en las APIs, puede()
        // en las páginas). Mostrarles el aviso decía justo lo contrario de la
        // verdad — PANEL_ACCESO es lo que deja entrar.
        const esBot = (p.ambito || "BOT") === "BOT";
        return (
          <tr key={p.clave} className={cn(historico && "opacity-60")}>
            <td className="px-3 py-2 align-top">
              <div className="font-mono text-xs font-semibold">{p.clave}</div>
              {p.descripcion && <div className="text-xs text-muted-foreground">{p.descripcion}</div>}
              {botones ? (
                <div className="mt-0.5 text-[11px] text-muted-foreground/70">Botones: {botones}</div>
              ) : esBot ? (
                // Sin fila en menu_items, tildar o destildar no cambia nada en el
                // bot: decirlo evita que alguien crea que revocó un acceso.
                <div className="mt-0.5 text-[11px] text-warning">
                  No gobierna ningún botón del menú — tildarlo no habilita nada
                </div>
              ) : null}
            </td>
            {roles.map((r) => {
              const k = key(r, p.clave);
              const on = granted.has(k);
              const fijo = r === "ADMIN" && IRREVOCABLES_ADMIN.includes(p.clave);
              if (fijo) {
                return (
                  <td key={r} className="px-3 py-2 text-center align-top">
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
                <td key={r} className="px-3 py-2 text-center align-top">
                  <button
                    onClick={() => onToggle(r, p.clave)}
                    disabled={busy.has(k)}
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded border text-xs transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                    title={on ? `Quitar ${p.clave} a ${r}` : `Dar ${p.clave} a ${r}`}
                  >
                    {busy.has(k) ? <Loader2 className="h-3 w-3 animate-spin" /> : on ? "✓" : ""}
                  </button>
                </td>
              );
            })}
            <td className="px-3 py-2 text-center align-top">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => onToggleFila(p, true)}
                  className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  title={`Dar ${p.clave} a todos los roles`}
                >
                  todos
                </button>
                <button
                  onClick={() => onToggleFila(p, false)}
                  className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  title={`Quitar ${p.clave} a todos los roles`}
                >
                  ninguno
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}
