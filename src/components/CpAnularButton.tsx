"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Ban, Loader2 } from "lucide-react";

export function CpAnularButton({
  trazabilidadId,
  cpe,
  nombre,
  sinCp = false,
}: {
  trazabilidadId: string;
  cpe: string;
  nombre: string;
  sinCp?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/cp/anular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trazabilidad_id: trazabilidadId, cpe, motivo }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) return setError(d.error || "No se pudo anular la CP");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMotivo("");
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
        title={sinCp ? "Anular los eventos sin CP" : "Anular todos los eventos de esta CP"}
      >
        <Ban className="h-3 w-3" />{sinCp ? "Anular" : "Anular CP"}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={sinCp ? "Anular eventos sin CP" : `Anular CP ${cpe}`}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Anula <b>todos los eventos vigentes {sinCp ? "sin CP asignada" : "de esta CP"}</b> (quedan
            marcados ANULADO con traza). No se borran físicamente. Actor: <b>{nombre}</b>.
          </p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (ej: CP cargada con datos incorrectos)…"
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={submit}
            disabled={loading || motivo.trim().length < 3}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}Anular toda la CP
          </button>
        </div>
      </Modal>
    </>
  );
}
