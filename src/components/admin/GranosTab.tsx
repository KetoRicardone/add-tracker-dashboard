"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wheat, Loader2, Plus, Check, X, Pencil, Power, ChevronDown, Trash2, Droplet, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Grano {
  codigo: string;
  nombre: string;
  vida_util_meses: number | null;
  observaciones: string | null;
  vigente: boolean;
  campos: string | number;
  usos: string | number;
  /** De parametros_calidad, la fila vigente. null = sin límite cargado. */
  humedad_pct_max: string | number | null;
  /** Grano en inglés para el rótulo de estiba (WSS, BCH…). null = el bot lo pide a mano. */
  codigo_export: string | null;
}

export interface CampoCalidad {
  codigo_grano: string;
  orden: number;
  campo_key: string;
  etiqueta: string;
  suma_caida: boolean;
}

// El bot usa este maestro para reconocer el grano de la CP, y los campos de
// calidad son literalmente las preguntas de RGAN-39 y qué suma a la caída total.
export function GranosTab({ granos, campos }: { granos: Grano[]; campos: CampoCalidad[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [edit, setEdit] = useState({ nombre: "", vida_util_meses: "" as string | number });
  const [nuevo, setNuevo] = useState({ codigo: "", nombre: "", vida_util_meses: "" });
  const [creando, setCreando] = useState(false);
  const [nuevoCampo, setNuevoCampo] = useState<{ grano: string; etiqueta: string; suma: boolean }>({ grano: "", etiqueta: "", suma: true });
  const [humedad, setHumedad] = useState<{ grano: string; valor: string }>({ grano: "", valor: "" });
  const [exportCod, setExportCod] = useState<{ grano: string; valor: string }>({ grano: "", valor: "" });

  async function llamar(url: string, method: string, body: Record<string, unknown> | null, tag: string) {
    setError("");
    setBusy(tag);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
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

  async function crearGrano(e: React.FormEvent) {
    e.preventDefault();
    setCreando(true);
    try {
      const ok = await llamar("/api/admin/granos", "POST", nuevo, "nuevo");
      if (ok) setNuevo({ codigo: "", nombre: "", vida_util_meses: "" });
    } finally {
      setCreando(false);
    }
  }

  async function guardarHumedad(grano: string) {
    const valor = humedad.grano === grano ? humedad.valor.trim().replace(",", ".") : "";
    await llamar("/api/admin/granos", "PATCH", { codigo: grano, humedad_pct_max: valor }, `${grano}:hum`);
  }

  async function guardarExport(grano: string) {
    const valor = exportCod.grano === grano ? exportCod.valor.trim().toUpperCase() : "";
    await llamar("/api/admin/granos", "PATCH", { codigo: grano, codigo_export: valor }, `${grano}:exp`);
  }

  async function agregarCampo(grano: string) {
    if (!nuevoCampo.etiqueta.trim()) return;
    const ok = await llamar("/api/admin/granos/campos", "POST",
      { codigo_grano: grano, etiqueta: nuevoCampo.etiqueta, suma_caida: nuevoCampo.suma }, `${grano}:campo`);
    if (ok) setNuevoCampo({ grano, etiqueta: "", suma: true });
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wheat className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Granos</h2>
          <span className="text-xs text-muted-foreground">{granos.length}</span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Catálogo de granos que comercializa ADD SA. Cada grano define sus campos de calidad, que son las
          preguntas del control RGAN-39 y determinan la caída total.
        </p>

        <form onSubmit={crearGrano} className="flex flex-wrap items-end gap-3">
          <div className="w-[110px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Código</label>
            <input
              value={nuevo.codigo}
              onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value.toUpperCase() })}
              placeholder="SES"
              className={cn(inputCls, "font-mono")}
              required
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre</label>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Sésamo"
              className={inputCls}
              required
            />
          </div>
          <div className="w-[140px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Vida útil (meses)</label>
            <input
              value={nuevo.vida_util_meses}
              onChange={(e) => setNuevo({ ...nuevo, vida_util_meses: e.target.value })}
              placeholder="opcional"
              inputMode="numeric"
              className={inputCls}
            />
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

      <div className="space-y-2">
        {granos.map((g) => {
          const misCampos = campos.filter((c) => c.codigo_grano === g.codigo).sort((a, b) => a.orden - b.orden);
          const open = abierto === g.codigo;
          const enEdicion = editando === g.codigo;
          return (
            <div key={g.codigo} className={cn("rounded-xl border border-border bg-card overflow-hidden", !g.vigente && "opacity-50")}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => {
                    setAbierto(open ? null : g.codigo);
                    setNuevoCampo({ grano: g.codigo, etiqueta: "", suma: true });
                    setHumedad({ grano: g.codigo, valor: g.humedad_pct_max == null ? "" : String(g.humedad_pct_max) });
                    setExportCod({ grano: g.codigo, valor: g.codigo_export || "" });
                  }}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                  <span className="font-mono text-xs font-semibold text-primary">{g.codigo}</span>
                  {enEdicion ? (
                    <input
                      value={edit.nombre}
                      onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(inputCls, "max-w-[220px]")}
                    />
                  ) : (
                    <span className="text-sm font-medium">{g.nombre}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {misCampos.length} {misCampos.length === 1 ? "campo" : "campos"}
                    {Number(g.usos) > 0 && ` · ${g.usos} trazabilidad(es)`}
                  </span>
                  {g.humedad_pct_max == null ? (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      sin humedad máx.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Droplet className="h-2.5 w-2.5" /> máx {g.humedad_pct_max}%
                    </span>
                  )}
                  {g.codigo_export ? (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                      <Tag className="h-2.5 w-2.5" /> {g.codigo_export}
                    </span>
                  ) : (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      sin código de rótulo
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1.5">
                  {enEdicion ? (
                    <>
                      <button
                        onClick={() => llamar("/api/admin/granos", "PATCH", { codigo: g.codigo, ...edit }, `${g.codigo}:save`).then((ok) => ok && setEditando(null))}
                        disabled={busy === `${g.codigo}:save`}
                        className="rounded-md p-1.5 text-success hover:bg-success/10"
                        title="Guardar"
                      >
                        {busy === `${g.codigo}:save` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setEditando(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" title="Cancelar">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditando(g.codigo); setEdit({ nombre: g.nombre, vida_util_meses: g.vida_util_meses ?? "" }); }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => llamar("/api/admin/granos", "PATCH", { codigo: g.codigo, vigente: !g.vigente }, `${g.codigo}:vig`)}
                        disabled={busy === `${g.codigo}:vig`}
                        className={cn("rounded-md p-1.5 hover:bg-secondary", g.vigente ? "text-muted-foreground" : "text-success")}
                        title={g.vigente ? "Dar de baja (no se borra: las trazabilidades lo conservan)" : "Reactivar"}
                      >
                        {busy === `${g.codigo}:vig` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {open && (
                <div className="border-t border-border/60 bg-secondary/10 px-4 py-3">
                  {/* Humedad máxima: la usa el control de Calidad MP (RGAN-38) para
                      decidir si el lote pasa, y se muestra al operario junto al valor medido. */}
                  <p className="mb-2 text-xs font-semibold text-foreground/80">Parámetro de calidad</p>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">Humedad máxima</label>
                    <input
                      value={humedad.grano === g.codigo ? humedad.valor : ""}
                      onChange={(e) => setHumedad({ grano: g.codigo, valor: e.target.value })}
                      placeholder="ej: 6.5"
                      inputMode="decimal"
                      className={cn(inputCls, "w-24 py-1.5 text-xs")}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <button
                      onClick={() => guardarHumedad(g.codigo)}
                      disabled={busy === `${g.codigo}:hum`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      {busy === `${g.codigo}:hum` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Guardar
                    </button>
                    {g.humedad_pct_max == null ? (
                      <span className="text-[11px] text-warning">
                        Sin límite cargado: el bot muestra “sin límite” y no rechaza por humedad.
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Vaciar el campo y guardar quita el límite. El histórico se conserva: se cierra la
                        vigencia y se abre una nueva, así los eventos viejos siguen validados con el valor de su fecha.
                      </span>
                    )}
                  </div>

                  {/* Grano en inglés del rótulo de estiba: AR-<código>-LE05-25.
                      Con esto el bot arma el rótulo solo en el Control de Proceso. */}
                  <p className="mb-2 text-xs font-semibold text-foreground/80">Rótulo de estiba</p>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">Grano en inglés</label>
                    <input
                      value={exportCod.grano === g.codigo ? exportCod.valor : ""}
                      onChange={(e) => setExportCod({ grano: g.codigo, valor: e.target.value.toUpperCase() })}
                      placeholder="ej: WSS"
                      maxLength={4}
                      className={cn(inputCls, "w-24 py-1.5 font-mono text-xs uppercase")}
                    />
                    <button
                      onClick={() => guardarExport(g.codigo)}
                      disabled={busy === `${g.codigo}:exp`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      {busy === `${g.codigo}:exp` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Guardar
                    </button>
                    {g.codigo_export ? (
                      <span className="text-[11px] text-muted-foreground">
                        El bot propone <span className="font-mono">AR-{g.codigo_export}-LE01-26</span> y numera solo la estiba.
                      </span>
                    ) : (
                      <span className="text-[11px] text-warning">
                        Sin código, el bot no puede armar el rótulo y lo pide tipeado. Conocidos: WSS sésamo blanco,
                        BCH chía negra, WCH chía blanca, WQ quinua blanca.
                      </span>
                    )}
                  </div>

                  <p className="mb-2 text-xs font-semibold text-foreground/80">Campos de calidad (RGAN-39)</p>
                  {misCampos.length === 0 && (
                    <p className="mb-2 text-xs text-warning">
                      Sin campos cargados: el control de calidad de este grano quedaría vacío en el bot.
                    </p>
                  )}
                  <div className="space-y-1">
                    {misCampos.map((c) => (
                      <div key={c.campo_key} className="flex items-center gap-2 rounded-md bg-card px-3 py-1.5 text-xs">
                        <span className="w-6 font-mono text-muted-foreground">{c.orden}</span>
                        <span className="flex-1">{c.etiqueta}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{c.campo_key}</span>
                        <button
                          onClick={() => llamar("/api/admin/granos/campos", "PATCH", { codigo_grano: g.codigo, campo_key: c.campo_key, suma_caida: !c.suma_caida }, `${c.campo_key}:suma`)}
                          className={cn("rounded px-2 py-0.5 text-[10px] font-medium", c.suma_caida ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}
                          title="Si suma a la caída total"
                        >
                          {c.suma_caida ? "suma caída" : "no suma"}
                        </button>
                        <button
                          onClick={() => llamar(`/api/admin/granos/campos?grano=${g.codigo}&campo=${c.campo_key}`, "DELETE", null, `${c.campo_key}:del`)}
                          disabled={busy === `${c.campo_key}:del`}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Quitar campo"
                        >
                          {busy === `${c.campo_key}:del` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={nuevoCampo.grano === g.codigo ? nuevoCampo.etiqueta : ""}
                      onChange={(e) => setNuevoCampo({ grano: g.codigo, etiqueta: e.target.value, suma: nuevoCampo.suma })}
                      placeholder="Nuevo campo (ej: Sobre zaranda 2.5)"
                      className={cn(inputCls, "flex-1 min-w-[200px] py-1.5 text-xs")}
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={nuevoCampo.grano === g.codigo ? nuevoCampo.suma : true}
                        onChange={(e) => setNuevoCampo({ grano: g.codigo, etiqueta: nuevoCampo.etiqueta, suma: e.target.checked })}
                      />
                      suma a la caída
                    </label>
                    <button
                      onClick={() => agregarCampo(g.codigo)}
                      disabled={busy === `${g.codigo}:campo`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                    >
                      {busy === `${g.codigo}:campo` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Agregar campo
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
