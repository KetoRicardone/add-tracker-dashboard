export interface Trazabilidad {
  trazabilidad_id: string;
  codigo_grano: string;
  codigo_establecimiento: string;
  campania: string;
  estado_trazabilidad: string;
  estado_operacional: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  eventos: TrazEvento[];
  firmas?: Firma[];
  /** Humedad máxima vigente del grano (parametros_calidad); null si no se cargó. */
  humedad_pct_max?: number | null;
  progreso: number;
  total_eventos: number;
  completados: number;
}

export interface Firma {
  firmante: string;
  evento_tipo: string;
  fecha: string;
  /** PK de auditoria_firmas: la apunta traz_eventos.firma_auditoria_id. */
  auditoria_id?: string | null;
}

export interface TrazEvento {
  evento_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  datos: Record<string, unknown>;
  /** Firma que cerró este evento. NULL en eventos previos a Etapa 1.2. */
  firma_auditoria_id?: string | null;
  humedad_pct?: number;
  total_caida_pct?: number;
  galpon?: string;
  url_drive?: string;
  hash_sha256?: string;
}

export interface EventDefinition {
  /** Identidad del paso en el circuito. Por defecto es `tipo_evento`; se declara
   *  aparte cuando dos pasos comparten tipo_evento (RGAN-38 P2 vs RGAN-39). */
  key?: string;
  tipo_evento: string;
  rgan: string;
  fase: number;
  nombre: string;
  descripcion: string;
  icon: string;
  gate: boolean;
  /** RGANs que comparten el mismo grupo se dibujan como un bloque conectado (ej: RGAN-38 Parte 1 + Parte 2) */
  grupo?: string;
  /** LOTE (por defecto) o PLANTA. Los de PLANTA no tienen trazabilidad_id: son
   *  operaciones de la línea (limpieza, mantenimiento) que ocurren entre lotes,
   *  y viven en traz_eventos_planta (ADR-001). No forman parte del progreso de
   *  ninguna trazabilidad. */
  ambito?: "LOTE" | "PLANTA";
}

/**
 * Evento de planta/turno: no pertenece a un lote (ADR-001).
 * Hoy: RGAN-40 (limpieza por cambio de grano) y RGAN-80 (mantenimiento diario).
 */
export interface EventoPlanta {
  evento_planta_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  datos: Record<string, unknown>;
  planta_codigo: string;
  linea_codigo?: string | null;
  turno?: string | null;
  /** Firma de quien ejecutó. Vínculo explícito evento → firma. */
  firma_auditoria_id?: string | null;
  /** Segunda firma de la planilla (Encargado de Planta / otro turno). Hoy
   *  siempre NULL: el gate de firma identifica al firmante por su chat, así que
   *  la verificación tiene que llegar desde el chat del verificador. */
  verificador_nombre?: string | null;
  firma_verificacion_id?: string | null;
}

export interface Stats {
  total_activas: number;
  total_cerradas: number;
  eventos_hoy: number;
  granos_unicos: number;
}

export interface Precarga {
  precarga_id: string;
  trazabilidad_id: string | null;
  cpe: string | null;
  foto_file_id: string;
  usuario_id: string | null;
  estado: string;
  created_at: string;
  vinculado_en: string | null;
  vinculado_por: string | null;
  items: PrecargaItem[];
}

export interface PrecargaItem {
  item_id: string;
  precarga_id: string;
  numero_precinto: string;
  orden: number;
  peso_kg: number | null;
  estado: string;
  peso_corregido: boolean;
  created_at: string;
}

/**
 * Big bags de una Carta de Porte y cuántos ya entraron a la línea de proceso.
 * Se calcula cruzando los precintos de RGAN-55 con los de RGAN-41: el número de
 * precinto es el dato duro, el `cpe` del evento de proceso es derivado.
 */
export interface ConsumoCP {
  recibidos: number;
  enProceso: number;
  kgRecibidos: number;
  kgEnProceso: number;
}
