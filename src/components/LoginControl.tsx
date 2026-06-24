"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { LogIn, LogOut, User, Loader2 } from "lucide-react";

interface Usuario {
  usuario_id: string;
  nombre: string;
}

export function LoginControl({ nombre }: { nombre: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [uid, setUid] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((d) => setUsuarios(d.usuarios || []))
      .catch(() => setUsuarios([]));
  }, [open]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: uid, pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }
      setOpen(false);
      setPin("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  if (nombre) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
          <User className="h-3.5 w-3.5" />
          {nombre}
        </span>
        <button
          onClick={logout}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
      >
        <LogIn className="h-3.5 w-3.5" />
        Iniciar sesión
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Iniciar sesión (operador)">
        <form onSubmit={login} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Necesario para anular o corregir datos. Usá tu PIN de firma.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium">Operador</label>
            <select
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccioná…</option>
              {usuarios.map((u) => (
                <option key={u.usuario_id} value={u.usuario_id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tracking-widest"
              placeholder="••••"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || !uid || !pin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </Modal>
    </>
  );
}
