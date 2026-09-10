import { FileText, FlaskConical, ImageIcon, AlertTriangle } from "lucide-react";
import { SectionCard } from "./SectionCard";
import type { DocumentoLote, EventoLote, LiberacionLote } from "@/lib/lotes";

/**
 * Documentos y análisis del lote.
 *
 * Hoy muestra tres cosas distintas, y conviene no confundirlas:
 *
 *  1. `documentos` — la ruta única del ADR-012, con hash. Está VACÍA: no hay
 *     almacenamiento conectado todavía (DT-14). Se consulta igual para que el
 *     día que se enchufe Supabase Storage aparezca acá sin tocar nada.
 *  2. Los análisis **declarados** en la liberación (laboratorio, nº de informe,
 *     tipo). Ese dato sí existe hoy: lo carga RGAN-104. Lo que no existe es el
 *     PDF detrás.
 *  3. La evidencia que mandaron por Telegram, que quedó como `file_id` dentro
 *     del JSONB del evento. No es un documento con hash ni se puede abrir desde
 *     el panel: es una referencia a un archivo que vive en los servidores de
 *     Telegram. Se lista para que conste que existe.
 */
export function DocumentosCard({
  documentos,
  liberaciones,
  eventos,
}: {
  documentos: DocumentoLote[];
  liberaciones: LiberacionLote[];
  eventos: EventoLote[];
}) {
  const analisis = liberaciones.filter((l) => l.laboratorio || l.informe_nro);
  const evidencia = evidenciaTelegram(eventos);
  const total = documentos.length + analisis.length + evidencia.length;

  return (
    <SectionCard
      titulo="Documentos y análisis"
      emoji="📎"
      contador={total}
      subtitulo="Informes de laboratorio, remitos y evidencia asociada al lote"
      vacio={
        <>
          Todavía no hay documentos para este lote.
          <br />
          <span className="text-xs">
            La carga de archivos (informes de laboratorio, remitos escaneados) necesita el
            almacenamiento que está decidido pero sin conectar.
          </span>
        </>
      }
    >
      <div className="space-y-4">
        {analisis.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Análisis declarados en la liberación
            </p>
            <ul className="space-y-2">
              {analisis.map((l) => (
                <li
                  key={l.liberacion_id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {l.laboratorio || "Laboratorio sin especificar"}
                      {l.informe_nro && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          Informe {l.informe_nro}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(l.tipo_analisis || []).length
                        ? (l.tipo_analisis || []).join(" · ")
                        : "Sin tipo de análisis declarado"}
                      {" — "}
                      {new Date(l.fecha_liberacion).toLocaleDateString("es-AR")}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-warning">
                      <AlertTriangle className="h-3 w-3" /> Declarado en el formulario; el PDF no
                      está adjunto
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {documentos.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Archivos
            </p>
            <ul className="space-y-2">
              {documentos.map((d) => (
                <li
                  key={d.doc_id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{d.nombre_archivo || d.tipo_doc}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.tipo_doc} — {new Date(d.created_at).toLocaleDateString("es-AR")}
                    </p>
                    {d.hash_sha256 && (
                      <p className="truncate font-mono text-[10px] text-muted-foreground/70">
                        sha256 {d.hash_sha256.slice(0, 16)}…
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {evidencia.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Evidencia enviada por Telegram
            </p>
            <ul className="space-y-2">
              {evidencia.map((e, i) => (
                <li
                  key={`${e.evento_id}-${i}`}
                  className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-background p-3"
                >
                  <ImageIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{e.etiqueta}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground/70">
                      file_id {e.file_id.slice(0, 24)}…
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Vive en Telegram, no en el sistema: no tiene hash ni se puede abrir desde acá.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/** Saca los file_id de Telegram que quedaron dentro del JSONB de los eventos. */
function evidenciaTelegram(eventos: EventoLote[]) {
  const out: { evento_id: string; etiqueta: string; file_id: string }[] = [];
  for (const e of eventos) {
    const d = (e.datos || {}) as Record<string, unknown>;
    for (const clave of ["fotos_evidencia", "foto", "file_id"]) {
      const v = d[clave];
      if (typeof v === "string" && v.length > 20) {
        out.push({ evento_id: e.evento_id, etiqueta: `${e.tipo_evento} — ${clave}`, file_id: v });
      } else if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.length > 20) {
            out.push({ evento_id: e.evento_id, etiqueta: `${e.tipo_evento} — ${clave}`, file_id: item });
          }
        }
      }
    }
  }
  return out;
}
