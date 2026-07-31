"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Search, Check, X, Pencil, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Establecimiento {
  codigo: string;
  nombre: string;
  tipo: string | null;
  observaciones: string | null;
  vigente: boolean;
  usos: string | number;
}

// Este catálogo es el que usa el OCR para resolver la Procedencia de la Carta de
// Porte: lo que se edita acá cambia el comportamiento del bot en la próxima CP.
export function EstablecimientosTab({ establecimientos, tipos }: { establecimientos: Establecimiento[]; tipos: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const [soloVigentes, setSoloVigentes] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [edit, setEdit] = useState({ nombre: "", tipo: "", observaciones: "" });
  const [nuevo, setNuevo] = useState({ codigo: "", nombre: "", tipo: tipos[0] || "Propio", observaciones: "" });
  const [creando, setCreando] = useState(false);

  const filtrados = useMemo(() => {
    const n = q.trim().toLowerCase();
    return establecimientos.filter((e) => {
      if (soloVigentes && !e.vigente) return false;
      if (!n) return true;
      return e.nombre.toLowerCase().includes(n) || e.codigo.toLowerCase().includes(n);
    });
  }, [establecimientos, q, soloVigentes]);

  async function enviar(method: "POST" | "PATCH", body: Record<string, unknown>, tag: string) {
    setError("");
    setBusy(tag);
    try {
      const res = await fetch("/api/admin/establecimientos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setError(d.error || "No se pudo guardar");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy("");
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      const ok = await enviar("POST", nuevo, "nuevo");
      if (ok) setNuevo({ codigo: "", nombre: "", tipo: tipos[0] || "Propio", observaciones: "" });
    } finally {
      setCreando(false);
    }
  }

  async function guardar(codigo: string) {
    const ok = await enviar("PATCH", { codigo, ...edit }, `${codigo}:save`);
    if (ok) setEditando(null);
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Establecimientos</h2>
          <span className="text-xs text-muted-foreground">
            {filtrados.length} de {establecimientos.length}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Catálogo que usa el bot para reconocer la Procedencia de la Carta de Porte. El tipo define el
          prefijo del número de trazabilidad (Propio 1 · Proveedor 2 · Cliente 3).
        </p>

        <form onSubmit={crear} className="flex flex-wrap items-end gap-3">
          <div className="w-[110px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Código</label>
            <input
              value={nuevo.codigo}
              onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value.toUpperCase() })}
              placeholder="SM1"
              className={cn(inputCls, "font-mono")}
              required
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Sta Magdalena I"
              className={inputCls}
              required
            />
          </div>
          <div className="min-w-[130px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })} className={inputCls}>
              {tipos.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creando}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className={cn(inputCls, "pl-9")}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={soloVigentes} onChange={(e) => setSoloVigentes(e.target.checked)} />
          Solo vigentes
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Código</th>
              <th className="px-3 py-2 text-left font-medium">Nombre</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-left font-medium">Trazabilidades</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtrados.map((e) => {
              const enEdicion = editando === e.codigo;
              return (
                <tr key={e.codigo} className={cn(!e.vigente && "opacity-50")}>
                  <td className="px-3 py-2 font-mono font-medium">{e.codigo}</td>
                  <td className="px-3 py-2">
                    {enEdicion ? (
                      <input value={edit.nombre} onChange={(ev) => setEdit({ ...edit, nombre: ev.target.value })} className={inputCls} />
                    ) : (
                      e.nombre
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {enEdicion ? (
                      <select value={edit.tipo} onChange={(ev) => setEdit({ ...edit, tipo: ev.target.value })} className={inputCls}>
                        {tipos.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{e.tipo || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{Number(e.usos) || 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {enEdicion ? (
                        <>
                          <button
                            onClick={() => guardar(e.codigo)}
                            disabled={busy === `${e.codigo}:save`}
                            className="rounded-md p-1.5 text-success hover:bg-success/10"
                            title="Guardar"
                          >
                            {busy === `${e.codigo}:save` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setEditando(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" title="Cancelar">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditando(e.codigo);
                              setEdit({ nombre: e.nombre, tipo: e.tipo || "", observaciones: e.observaciones || "" });
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => enviar("PATCH", { codigo: e.codigo, vigente: !e.vigente }, `${e.codigo}:vig`)}
                            disabled={busy === `${e.codigo}:vig`}
                            className={cn("rounded-md p-1.5 hover:bg-secondary", e.vigente ? "text-muted-foreground" : "text-success")}
                            title={e.vigente ? "Dar de baja (no se borra: las trazabilidades lo conservan)" : "Reactivar"}
                          >
                            {busy === `${e.codigo}:vig` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtrados.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay establecimientos que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
