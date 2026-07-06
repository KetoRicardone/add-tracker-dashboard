"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ChevronDown, ChevronRight, Pencil, Trash2, Check, X, Loader2, Scale, Link2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Modal } from "@/components/Modal";
import type { Precarga, PrecargaItem } from "@/lib/types";

export interface PrecargaAdminData {
  precargas: Precarga[];
}

interface CpDisponible {
  trazabilidad_id: string;
  codigo_grano: string;
  codigo_establecimiento: string;
  campania: string;
  cpe: string | null;
}

export function PrecintosTab({ data }: { data: PrecargaAdminData }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  // Inline edit state
  const [editingNumero, setEditingNumero] = useState<string | null>(null);
  const [editNumValue, setEditNumValue] = useState("");
  const [editingPeso, setEditingPeso] = useState<string | null>(null);
  const [editPesoValue, setEditPesoValue] = useState("");

  // Vincular sin-CP → CP
  const [vincularFor, setVincularFor] = useState<string | null>(null);
  const [cps, setCps] = useState<CpDisponible[]>([]);
  const [cpsLoading, setCpsLoading] = useState(false);
  const [cpSel, setCpSel] = useState("");
  const [vincError, setVincError] = useState("");

  async function openVincular(precargaId: string) {
    setVincularFor(precargaId);
    setCpSel("");
    setVincError("");
    setCps([]);
    setCpsLoading(true);
    try {
      const res = await fetch("/api/admin/precargas/cps-disponibles");
      const d = await res.json();
      if (!res.ok || !d.ok) setVincError(d.error || "No se pudieron cargar las CPs");
      else setCps(d.cps || []);
    } catch {
      setVincError("No se pudieron cargar las CPs");
    } finally {
      setCpsLoading(false);
    }
  }

  async function confirmVincular() {
    if (!vincularFor || cpSel === "") return;
    const cp = cps[Number(cpSel)];
    if (!cp) return;
    setVincError("");
    setBusy(`${vincularFor}:vinc`);
    try {
      const res = await fetch(`/api/admin/precargas/${vincularFor}/vincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trazabilidad_id: cp.trazabilidad_id, cpe: cp.cpe }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setVincError(d.error || "No se pudo vincular");
        return;
      }
      setVincularFor(null);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function patchNumero(itemId: string, numeroPrecinto: string) {
    setError("");
    setBusy(`${itemId}:num`);
    try {
      const res = await fetch(`/api/admin/precargas/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero_precinto: numeroPrecinto }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo actualizar");
      else router.refresh();
    } finally {
      setBusy("");
      setEditingNumero(null);
    }
  }

  async function patchPeso(itemId: string, pesoKg: number) {
    setError("");
    setBusy(`${itemId}:peso`);
    try {
      const res = await fetch(`/api/admin/precargas/items/${itemId}/peso`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peso_kg: pesoKg }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo actualizar");
      else router.refresh();
    } finally {
      setBusy("");
      setEditingPeso(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("¿Descartar este precinto? No se usara en RGAN-55.")) return;
    setError("");
    setBusy(`${itemId}:del`);
    try {
      const res = await fetch(`/api/admin/precargas/items/${itemId}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo eliminar");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function deletePrecarga(precargaId: string) {
    if (!confirm("¿Descartar toda la precarga? Todos sus items quedaran como DESCARTADO.")) return;
    setError("");
    setBusy(`${precargaId}:delall`);
    try {
      const res = await fetch(`/api/admin/precargas/${precargaId}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok || !d.ok) setError(d.error || "No se pudo eliminar");
      else router.refresh();
    } finally {
      setBusy("");
    }
  }

  const { precargas } = data;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium"></th>
              <th className="px-3 py-2 text-left font-medium">CP / Trazabilidad</th>
              <th className="px-3 py-2 text-left font-medium">Precintos</th>
              <th className="px-3 py-2 text-left font-medium">Fecha</th>
              <th className="px-3 py-2 text-left font-medium">Estado</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {precargas.map((p) => (
              <>
                <tr
                  key={p.precarga_id}
                  className={cn(
                    "cursor-pointer hover:bg-secondary/20 transition-colors",
                    p.estado === "DESCARTADO" && "opacity-50"
                  )}
                >
                  <td className="px-3 py-2 w-8">
                    <button
                      onClick={() => setExpanded(expanded === p.precarga_id ? null : p.precarga_id)}
                      className="rounded p-0.5 hover:bg-secondary"
                    >
                      {expanded === p.precarga_id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2" onClick={() => setExpanded(expanded === p.precarga_id ? null : p.precarga_id)}>
                    <div className="font-medium">{p.cpe || "—"}</div>
                    {p.trazabilidad_id ? (
                      <div className="text-xs text-muted-foreground font-mono">{p.trazabilidad_id}</div>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                        🔓 Sin CP
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" onClick={() => setExpanded(expanded === p.precarga_id ? null : p.precarga_id)}>
                    {p.items.length} precinto{p.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground" onClick={() => setExpanded(expanded === p.precarga_id ? null : p.precarga_id)}>
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <PrecargaStatusBadge estado={p.estado} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {!p.trazabilidad_id && p.estado !== "DESCARTADO" && (
                        <button
                          title="Vincular a una Carta de Porte"
                          onClick={(e) => { e.stopPropagation(); openVincular(p.precarga_id); }}
                          disabled={busy === `${p.precarga_id}:vinc`}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                        >
                          {busy === `${p.precarga_id}:vinc` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Link2 className="h-3.5 w-3.5" />
                          )}
                          Vincular
                        </button>
                      )}
                      <button
                        title="Descartar precarga"
                        onClick={(e) => { e.stopPropagation(); deletePrecarga(p.precarga_id); }}
                        disabled={busy === `${p.precarga_id}:delall` || p.estado === "DESCARTADO"}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {busy === `${p.precarga_id}:delall` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded items */}
                {expanded === p.precarga_id && (
                  <tr key={`${p.precarga_id}-items`}>
                    <td colSpan={6} className="px-3 py-2 bg-secondary/10">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium">#</th>
                              <th className="px-2 py-1 text-left font-medium">Nro Precinto</th>
                              <th className="px-2 py-1 text-left font-medium">Peso (kg)</th>
                              <th className="px-2 py-1 text-left font-medium">Estado</th>
                              <th className="px-2 py-1 text-right font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.items.map((item) => (
                              <tr key={item.item_id} className={cn(item.estado === "DESCARTADO" && "opacity-40 line-through")}>
                                <td className="px-2 py-1 text-muted-foreground">{item.orden}</td>
                                <td className="px-2 py-1">
                                  {editingNumero === item.item_id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        value={editNumValue}
                                        onChange={(e) => setEditNumValue(e.target.value)}
                                        className="w-28 rounded border border-border bg-background px-2 py-0.5 font-mono"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") patchNumero(item.item_id, editNumValue);
                                          if (e.key === "Escape") setEditingNumero(null);
                                        }}
                                      />
                                      <button onClick={() => patchNumero(item.item_id, editNumValue)} disabled={busy === `${item.item_id}:num`} className="rounded p-0.5 text-success hover:bg-success/10">
                                        {busy === `${item.item_id}:num` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      </button>
                                      <button onClick={() => setEditingNumero(null)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary"><X className="h-3 w-3" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono">{item.numero_precinto}</span>
                                      {item.estado === "EDITADO" && <span className="text-amber-500 text-[10px]">(editado)</span>}
                                      {item.estado !== "DESCARTADO" && (
                                        <button
                                          onClick={() => { setEditingNumero(item.item_id); setEditNumValue(item.numero_precinto); }}
                                          className="rounded p-0.5 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                          title="Editar numero (correccion OCR)"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  {editingPeso === item.item_id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        value={editPesoValue}
                                        onChange={(e) => setEditPesoValue(e.target.value)}
                                        className="w-20 rounded border border-border bg-background px-2 py-0.5 font-mono"
                                        type="number"
                                        step="0.01"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") patchPeso(item.item_id, parseFloat(editPesoValue) || 0);
                                          if (e.key === "Escape") setEditingPeso(null);
                                        }}
                                      />
                                      <button onClick={() => patchPeso(item.item_id, parseFloat(editPesoValue) || 0)} disabled={busy === `${item.item_id}:peso`} className="rounded p-0.5 text-success hover:bg-success/10">
                                        {busy === `${item.item_id}:peso` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      </button>
                                      <button onClick={() => setEditingPeso(null)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary"><X className="h-3 w-3" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className={cn("font-mono", item.peso_corregido && "text-amber-500")}>
                                        {item.peso_kg != null ? `${item.peso_kg.toLocaleString()} kg` : "—"}
                                      </span>
                                      {item.peso_corregido && <span className="text-amber-500 text-[10px]">(corregido)</span>}
                                      {item.estado !== "DESCARTADO" && (
                                        <button
                                          onClick={() => { setEditingPeso(item.item_id); setEditPesoValue(String(item.peso_kg ?? "")); }}
                                          className="rounded p-0.5 text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10"
                                          title="Corregir peso"
                                        >
                                          <Scale className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  <ItemStatusBadge estado={item.estado} />
                                </td>
                                <td className="px-2 py-1">
                                  <div className="flex items-center justify-end">
                                    {item.estado !== "DESCARTADO" && (
                                      <button
                                        title="Descartar precinto"
                                        onClick={() => deleteItem(item.item_id)}
                                        disabled={busy === `${item.item_id}:del`}
                                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                                      >
                                        {busy === `${item.item_id}:del` ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {precargas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <PackageSearch className="h-8 w-8" />
                    <p>No hay precargas registradas.</p>
                    <p className="text-xs">Usa el bot de Telegram → "Pre Carga Presinto" para crear una.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={vincularFor !== null} onClose={() => setVincularFor(null)} title="Vincular precarga a una Carta de Porte">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Elegí la Carta de Porte a la que corresponde esta precarga sin CP. Los precintos quedarán disponibles para RGAN-55.
          </p>
          {cpsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando Cartas de Porte…
            </div>
          ) : cps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay Cartas de Porte disponibles (con OCR y sin precarga). Cargá la CP desde el bot primero.
            </p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium">Carta de Porte</label>
              <select
                value={cpSel}
                onChange={(e) => setCpSel(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccioná…</option>
                {cps.map((cp, i) => (
                  <option key={`${cp.trazabilidad_id}-${cp.cpe ?? i}`} value={String(i)}>
                    {cp.cpe ? `CP ${cp.cpe}` : cp.trazabilidad_id} — {cp.trazabilidad_id} ({cp.codigo_grano})
                  </option>
                ))}
              </select>
            </div>
          )}
          {vincError && <p className="text-xs text-destructive">{vincError}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setVincularFor(null)}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={confirmVincular}
              disabled={cpSel === "" || busy.endsWith(":vinc")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy.endsWith(":vinc") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Vincular
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PrecargaStatusBadge({ estado }: { estado: string }) {
  const tones: Record<string, string> = {
    CONFIRMADO: "bg-success/15 text-success",
    DESCARTADO: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tones[estado] || "bg-secondary text-muted-foreground")}>
      {estado}
    </span>
  );
}

function ItemStatusBadge({ estado }: { estado: string }) {
  const tones: Record<string, string> = {
    PENDIENTE: "bg-secondary text-muted-foreground",
    ASIGNADO: "bg-success/15 text-success",
    DESCARTADO: "bg-destructive/15 text-destructive",
    EDITADO: "bg-amber-500/15 text-amber-500",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tones[estado] || "bg-secondary text-muted-foreground")}>
      {estado}
    </span>
  );
}
