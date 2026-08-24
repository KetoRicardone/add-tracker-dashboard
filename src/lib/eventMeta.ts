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
  EV_CONTROL_CALIDAD_MP: "RGAN-39 — Calidad de Ingreso",
  EV_INGRESO_MP_DETALLE: "RGAN-55 — Ingreso de MP",
  EV_CONTROL_PROCESO: "RGAN-53 — Control de Proceso",
  EV_REPROCESO: "RGAN-60 — Reproceso",
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
  checklist_observaciones: "Motivos de los NO",
  respuestas_contaminacion: "Contaminación",
  glifo: "Glifo",
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
  // Campos de calidad por grano (RGAN-39, maestro granos_campos_calidad)
  sobre_zaranda_pct: "Sobre zaranda",
  bajo_zaranda_pct: "Bajo zaranda",
  mi_me_pct: "M.I + M.E",
  me_mi_pct: "ME/MI análisis",
  semillas_extranas_pct: "Semillas extrañas",
  manchado_pct: "Manchado",
  danado_pct: "Dañado",
  g_danados_pct: "Granos dañados",
  calibre_4_pct: "Calibre 4",
  calibre_3_5_pct: "Calibre 3,5",
  calibre_3_25_pct: "Calibre 3,25",
  bs_zaranda_pct: "B/S Zaranda",
  arrugado_pct: "Arrugado",
  arrugados_pct: "Arrugados",
  manchado_vaina_pct: "Manchado en vaina",
  manchado_ardido_amb_pct: "Manch.-Ardido-Amb.",
  arrastre_pct: "Arrastre",
  cascara_danada_pct: "Cáscara dañada",
  partido_pct: "Partido",
  q_partido_pct: "Quebrado + Partido",
  descorticado_pct: "Descorticado",
  ambiental_pct: "Ambiental",
  oxidados_pct: "Oxidados",
  revolcado_pct: "Revolcado",
  chuzos_otro_color_pct: "Chuzos / Otro color",
  chico_pct: "Chico",
  mi_pct: "M.I.",
  grano_danado_pct: "Grano dañado",
  dano_ambiental_pct: "Daño ambiental",
  k10_pct: "K-10",
  insectos_pct: "Insectos",
  kgs_netos: "Kgs netos",
  caida_total_pct: "Caída total",
  caida_total_kg: "Caída total (kg)",
  calidad_grano: "Grano",
  destino: "Destino",
  defectos: "Campos de calidad",
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
  // RGAN-41 Ingreso a Proceso
  codigo_grano: "Grano",
  grano_anterior: "Grano anterior",
  cambio_grano: "Cambio de grano",
  nro: "Precinto",
  tipo_ingreso: "Tipo de ingreso",
  peso_total: "Peso total",
  firmado_por: "Firmado por",
  seleccion: "Selección",
  // RGAN-53 Control de Proceso — encabezado del turno + lecturas horarias
  estiba: "Estiba",
  planta: "Planta",
  turno: "Turno",
  variedad: "Variedad",
  campo: "Campo",
  lecturas: "Lecturas del turno",
  cantidad_lecturas: "Cantidad de lecturas",
  hora: "Hora",
  peso_muestra: "Peso de muestra",
  pureza_pct: "Pureza",
  detector_metales: "Detector de metales",
  interrupcion: "Interrupción",
  // RGAN-60 Reproceso
  precintos: "Precintos",
  cantidad_precintos: "Cantidad de precintos",
  total_kg: "Total",
  color_precinto: "Color de precinto",
  mantiene_trazabilidad_establecimiento: "Trazabilidad por establecimiento",
  // RGAN-61 Caídas de Proceso
  descarte_kg: "Descarte",
  basura_kg: "Basura",
  total_caida_kg: "Caída total",
  observacion: "Observación",
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
  if (key === "glifo") {
    const g = String(value).toUpperCase();
    if (g === "CON") return "Con Glifo";
    if (g === "SIN") return "Sin Glifo";
  }
  if (key === "tipo_ingreso") {
    const t = String(value).toUpperCase();
    if (t === "GRANEL") return "Granel";
    if (t === "BB") return "Big Bags";
  }
  const unit = unitForKey(key);
  if (typeof value === "number") return unit ? `${value} ${unit}` : String(value);
  return unit ? `${value} ${unit}` : String(value);
}

// ── Humedad vs. límite del grano ────────────────────────────────────────────
// R-PRAN-02: por encima del máximo + 2 puntos el lote se rechaza. Entre el
// máximo y +2 está tolerado. Sin límite cargado no hay nada que comparar.
export const TOLERANCIA_HUMEDAD = 2;

/** Antes de F0_020 el workflow inventaba 99 cuando el grano no tenía parámetro.
 *  Quedó guardado en eventos viejos; 99% de humedad no existe, así que se
 *  descarta como "sin límite" en vez de mostrarlo como umbral válido. */
const LIMITE_FALSO_LEGACY = 99;

export function limiteHumedadValido(valor: unknown): number | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n >= LIMITE_FALSO_LEGACY) return null;
  return n;
}

export type EstadoHumedad = "sin_limite" | "ok" | "excedido" | "rechazo";

export function estadoHumedad(humedad: unknown, limite: number | null): EstadoHumedad {
  const h = typeof humedad === "number" ? humedad : Number(humedad);
  if (limite == null || !Number.isFinite(h)) return "sin_limite";
  if (h > limite + TOLERANCIA_HUMEDAD) return "rechazo";
  if (h > limite) return "excedido";
  return "ok";
}

/** ¿es un objeto plano de solo booleanos? (checklist) */
export function isBooleanMap(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const vals = Object.values(value as Record<string, unknown>);
  return vals.length > 0 && vals.every((v) => typeof v === "boolean");
}

/** Valor de un ítem de checklist: SI (true) / NO (false) / No aplica ('NA'). */
export type ChecklistValue = boolean | "NA";

/** ¿es un checklist? objeto plano cuyos valores son boolean o 'NA' (tri-estado). */
export function isChecklistMap(value: unknown): value is Record<string, ChecklistValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const vals = Object.values(value as Record<string, unknown>);
  return vals.length > 0 && vals.every((v) => typeof v === "boolean" || v === "NA");
}
