"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, Loader2, Ban, CheckCircle2, ShieldOff } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

export interface Usuario {
  usuario_id: string;
  nombre: string;
  telegram_id: string | null;
  rol: string;
  activo: boolean;
  bloqueado: boolean;
  pin_bloqueado: boolean;
  requiere_cambio_pin: boolean;
  tiene_pin: boolean;
  ultimo_acceso: string | null;
  creado_en: string | null;
}

export function UsuariosTab({ usuarios, roles }: { usuarios: Usuario[]; roles: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", rol: roles[0] || "", telegram_id: "" });
  const [creando, setCreando] = useState(false);

  async function patch(id: string, body: Record<string, unknown>, tag: string) {
    setError("");
    setBusy(`${id}:${tag}`);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo actualizar");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function resetPin(id: string) {
    setError("");
    setBusy(`${id}:pin`);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}/reset-pin`, { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo resetear el PIN");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreando(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setError(d.error || "No se pudo crear el usuario");
        return;
      }
      setNuevo({ nombre: "", rol: roles[0] || "", telegram_id: "" });
      router.refresh();
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Alta */}
      <form onSubmit={crear} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label>
          <input
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            required
            placeholder="Nombre y apellido"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Rol</label>
          <select
            value={nuevo.rol}
            onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Telegram ID (opcional)</label>
          <input
            value={nuevo.telegram_id}
            onChange={(e) => setNuevo({ ...nuevo, telegram_id: e.target.value })}
            inputMode="numeric"
            placeholder="ej: 1419700059"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creando || !nuevo.nombre.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Crear usuario
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Usuario</th>
              <th className="px-3 py-2 text-left font-medium">Rol</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-left font-medium">Último acceso</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((u) => (
              <tr key={u.usuario_id} className={cn(!u.activo && "opacity-50")}>
                <td className="px-3 py-2">
                  <div className="font-medium">{u.nombre}</div>
                  <div className="text-xs text-muted-foreground font-mono">{u.telegram_id || "sin telegram"}</div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.rol}
                    onChange={(e) => patch(u.usuario_id, { rol: e.target.value }, "rol")}
                    disabled={busy === `${u.usuario_id}:rol`}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.activo ? (
                      <Badge tone="ok">activo</Badge>
                    ) : (
                      <Badge tone="muted">inactivo</Badge>
                    )}
                    {u.bloqueado && <Badge tone="bad">bloqueado</Badge>}
                    {u.tiene_pin ? <Badge tone="ok">PIN ✓</Badge> : <Badge tone="warn">sin PIN</Badge>}
                    {u.pin_bloqueado && <Badge tone="bad">PIN bloq.</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.ultimo_acceso ? formatDate(u.ultimo_acceso) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn
                      title={u.activo ? "Desactivar" : "Activar"}
                      busy={busy === `${u.usuario_id}:activo`}
                      onClick={() => patch(u.usuario_id, { activo: !u.activo }, "activo")}
                      tone={u.activo ? "muted" : "ok"}
                    >
                      {u.activo ? <ShieldOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </IconBtn>
                    <IconBtn
                      title={u.bloqueado ? "Desbloquear" : "Bloquear"}
                      busy={busy === `${u.usuario_id}:bloqueado`}
                      onClick={() => patch(u.usuario_id, { bloqueado: !u.bloqueado, pin_bloqueado: u.bloqueado ? false : u.pin_bloqueado }, "bloqueado")}
                      tone={u.bloqueado ? "ok" : "bad"}
                    >
                      <Ban className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      title="Resetear PIN (lo recrea desde el bot)"
                      busy={busy === `${u.usuario_id}:pin`}
                      onClick={() => resetPin(u.usuario_id)}
                      tone="warn"
                    >
                      <KeyRound className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay usuarios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "bad" | "warn" | "muted"; children: React.ReactNode }) {
  const tones = {
    ok: "bg-success/15 text-success",
    bad: "bg-destructive/15 text-destructive",
    warn: "bg-amber-500/15 text-amber-500",
    muted: "bg-secondary text-muted-foreground",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tones[tone])}>{children}</span>;
}

function IconBtn({
  title,
  onClick,
  busy,
  tone,
  children,
}: {
  title: string;
  onClick: () => void;
  busy: boolean;
  tone: "ok" | "bad" | "warn" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "text-success hover:bg-success/10",
    bad: "text-destructive hover:bg-destructive/10",
    warn: "text-amber-500 hover:bg-amber-500/10",
    muted: "text-muted-foreground hover:bg-secondary",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={busy}
      className={cn("rounded-md p-1.5 transition-colors disabled:opacity-50", tones[tone])}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}
