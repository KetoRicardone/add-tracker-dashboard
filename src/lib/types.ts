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
  progreso: number;
  total_eventos: number;
  completados: number;
}

export interface TrazEvento {
  evento_id: string;
  tipo_evento: string;
  fecha: string;
  resultado: string;
  responsable: string;
  datos: Record<string, unknown>;
  humedad_pct?: number;
  total_caida_pct?: number;
  galpon?: string;
  url_drive?: string;
  hash_sha256?: string;
}

export interface EventDefinition {
  tipo_evento: string;
  rgan: string;
  fase: number;
  nombre: string;
  descripcion: string;
  icon: string;
  gate: boolean;
  /** RGANs que comparten el mismo grupo se dibujan como un bloque conectado (ej: RGAN-38 Parte 1 + Parte 2) */
  grupo?: string;
}

export interface Stats {
  total_activas: number;
  total_cerradas: number;
  eventos_hoy: number;
  granos_unicos: number;
}
