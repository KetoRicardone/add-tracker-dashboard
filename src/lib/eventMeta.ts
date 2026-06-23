// Metadatos de presentación de eventos: iconos por RGAN, etiquetas legibles
// de campos y semántica visual del resultado. Centralizado para que las
// vistas no repitan diccionarios ni vuelquen JSON crudo.

/** Emoji por nombre de icono definido en events.ts (def.icon) */
export const EVENT_EMOJI: Record<string, string> = {
  Camera: "📷",
  Truck: "🚛",
  FlaskConical: "🧪",
  PackageCheck: "🏭",
  ArrowRightLeft: "🔄",
  Gauge: "📊",
  Trash2: "🗑️",
  Repeat: "🔁",
  Package: "📦",
  Scale: "⚖️",
  Magnet: "🧲",
  ShieldCheck: "🛡️",
  Warehouse: "🏬",
  Ship: "🚢",
  ClipboardCheck: "📋",
  Boxes: "📥",
};

export function emojiForIcon(icon?: string): string {
  if (!icon) return "📄";
  return EVENT_EMOJI[icon.trim()] || "📄";
}

/** Emoji por grupo RGAN (para encabezados de grupo) */
export const RGAN_EMOJI: Record<string, string> = {
  "RGAN-38": "🚛",
};

/** Etiqueta amigable para evento_tipo de firmas (auditoria_firmas.evento_tipo) */
export const FIRMA_EVENTO_LABEL: Record<string, string> = {
  RGAN38_COMPLETO: "RGAN-38 — Recepción + Calidad MP",
};

export function firmaEventoLabel(tipo?: string | null): string {
  if (!tipo) return "Documento";
  return FIRMA_EVENTO_LABEL[tipo] || tipo.replace(/_/g, " ");
}

// ── Semántica de resultado ────────────────────────────────────────────────
export type ResultTone = "success" | "warning" | "danger" | "neutral";

export function resultTone(resultado?: string | null): ResultTone {
  const r = (resultado || "").toUpperCase();
  if (["OK", "APROBADO", "ACEPTADO", "ACEPTAR", "COMPLETO"].includes(r)) return "success";
  if (["CONDICIONAL", "RETENER", "PENDIENTE", "PARCIAL"].includes(r)) return "warning";
  if (["RECHAZADO", "RECHAZAR", "FALLIDO", "ERROR"].includes(r)) return "danger";
  return "neutral";
}

// ── Etiquetas de campos (datos_evento) ────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  encarpado: "Encarpado",
  sin_olores: "Sin olores",
  big_bags_secos: "Big bags secos",
  uniones_limpias: "Uniones limpias",
  sin_otros_granos: "Sin otros granos",
  aceptacion_camion: "Aceptación camión",
  boquillas_limpias: "Boquillas limpias",
  sin_residuos_quimicos: "Sin residuos químicos",
  checklist_respuestas: "Checklist",
  respuestas_contaminacion: "Contaminación",
  cp_seleccionada: "Carta de Porte",
  cpe: "Carta de Porte",
  tipo_carga: "Tipo de carga",
  cal_tipo_carga: "Tipo de carga",
  humedad_pct: "Humedad",
  me_pct: "Materia extraña",
  total_calado: "Total calado",
  total_ingresado: "Total ingresado",
  granos_danados: "Granos dañados",
  zaranda_sobre: "Zaranda (sobre)",
  zaranda_bajo: "Zaranda (bajo)",
  zaranda_sobre_bajo: "Zaranda sobre/bajo",
  accion_tomada: "Acción tomada",
  cal_resultado: "Resultado calidad",
  rec_resultado: "Resultado recepción",
  resultado: "Resultado",
  trazabilidad_id: "Trazabilidad",
  peso_bruto: "Peso bruto",
  peso_neto: "Peso neto",
  remitente: "Remitente",
  transporte: "Transporte",
  chofer: "Chofer",
  domicilio: "Domicilio",
  n_planta: "Nº planta",
  grano: "Grano",
  campania: "Campaña",
  gmo: "GMO",
  gluten: "Gluten",
  alergeno: "Alérgeno",
  observaciones_finales: "Observaciones finales",
};

/** snake_case → "Texto Legible" (con diccionario por excepciones) */
export function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_pct$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Devuelve unidad para un campo, si aplica */
export function unitForKey(key: string): string {
  if (key.endsWith("_pct")) return "%";
  if (key.endsWith("_kg") || key.startsWith("peso")) return "kg";
  return "";
}

/** Formatea un valor escalar para mostrar */
export function formatScalar(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const unit = unitForKey(key);
  if (typeof value === "number") return unit ? `${value} ${unit}` : String(value);
  return unit ? `${value} ${unit}` : String(value);
}

/** ¿es un objeto plano de solo booleanos? (checklist) */
export function isBooleanMap(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const vals = Object.values(value as Record<string, unknown>);
  return vals.length > 0 && vals.every((v) => typeof v === "boolean");
}
