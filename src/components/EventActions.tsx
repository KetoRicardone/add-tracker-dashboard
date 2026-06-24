"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Ban, Pencil, Loader2 } from "lucide-react";

export function EventActions({
  eventoId,
  datos,
  nombre,
}: {
  eventoId: string;
  datos: Record<string, unknown>;
  nombre: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "anular" | "corregir">(null);
  const [motivo, setMotivo] = useState("");
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openAnular() {
    setMotivo("");
    setError("");
    setMode("anular");
  }
  function openCorregir() {
    // Excluye claves internas de auditoría del editor.
    const limpio: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(datos)) if (!k.startsWith("_")) limpio[k] = v;
    setJson(JSON.stringify(limpio, null, 2));
    setMotivo("");
    setError("");
    setMode("corregir");
  }

  async function submitAnular() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/eventos/${eventoId}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) return setError(d.error || "No se pudo anular");
      setMode(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function submitCorregir() {
    setError("");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      return setError("El JSON de datos no es válido");
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/eventos/${eventoId}/corregir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datos: parsed, motivo }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) return setError(d.error || "No se pudo corregir");
      setMode(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={openCorregir}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Pencil className="h-3 w-3" />Corregir
        </button>
        <button
          onClick={openAnular}
          className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Ban className="h-3 w-3" />Anular
        </button>
      </div>

      {/* Anular */}
      <Modal open={mode === "anular"} onClose={() => setMode(null)} title="Anular evento">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            El evento no se borra: queda marcado <b>ANULADO</b> y se registra quién y por qué
            (auditoría ADR-009). Actor: <b>{nombre}</b>.
          </p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la anulación…"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={submitAnular}
            disabled={loading || motivo.trim().length < 3}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}Anular evento
          </button>
        </div>
      </Modal>

      {/* Corregir */}
      <Modal open={mode === "corregir"} onClose={() => setMode(null)} title="Corregir evento">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Se crea un evento <b>nuevo</b> con los datos corregidos; el original queda
            <b> SUPERSEDIDO</b> (no se pierde). Editá los valores y dejá un motivo.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium">Datos (JSON)</label>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px]"
            />
          </div>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la corrección…"
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={submitCorregir}
            disabled={loading || motivo.trim().length < 3}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}Guardar corrección
          </button>
        </div>
      </Modal>
    </>
  );
}
