import { EventDefinition, TrazEvento } from "./types";

export const EVENT_DEFINITIONS: EventDefinition[] = [
  // FASE 1 — Recepción
  {
    tipo_evento: "EV_OCR_CARTA_PORTE",
    rgan: "OCR",
    fase: 1,
    nombre: "Carta de Porte",
    descripcion: "CP escaneada por OCR desde foto",
    icon: "Camera",
    gate: false,
  },
  {
    tipo_evento: "EV_CONTROL_CAMION",
    rgan: "RGAN-38",
    fase: 1,
    nombre: "Control de Camión",
    descripcion: "RGAN-38 Parte 1 — Recepción: tipo carga, pesos, humedad, zaranda, contaminación",
    icon: "Truck",
    gate: false,
    grupo: "RGAN-38",
  },
  {
    tipo_evento: "EV_CONTROL_CALIDAD_MP",
    rgan: "RGAN-38",
    fase: 1,
    nombre: "Control de Calidad MP",
    descripcion: "RGAN-38 Parte 2 — Medición por grano, cálculo de caída total, asignación de galpón",
    icon: "FlaskConical",
    gate: false,
    grupo: "RGAN-38",
  },
  {
    tipo_evento: "EV_INGRESO_MP_DETALLE",
    rgan: "RGAN-55",
    fase: 1,
    nombre: "Ingreso de MP",
    descripcion: "Registro de precintos y pesos por Big Bag",
    icon: "PackageCheck",
    gate: false,
  },
  // FASE 2 — Procesamiento
  {
    tipo_evento: "EV_INGRESO_A_PROCESO",
    rgan: "RGAN-41",
    fase: 2,
    nombre: "Ingreso a Procesamiento",
    descripcion: "Entrada del lote a la línea de proceso",
    icon: "ArrowRightLeft",
    gate: false,
  },
  {
    tipo_evento: "EV_CONTROL_PROCESO",
    rgan: "RGAN-53",
    fase: 2,
    nombre: "Control de Proceso",
    descripcion: "12 campos: pureza, defectos, detector marca, estiba",
    icon: "Gauge",
    gate: false,
  },
  {
    tipo_evento: "EV_CAIDAS_PROCESO",
    rgan: "RGAN-61",
    fase: 2,
    nombre: "Caídas de Proceso",
    descripcion: "Registro de descarte y basura del proceso",
    icon: "Trash2",
    gate: false,
  },
  {
    tipo_evento: "EV_REPROCESO",
    rgan: "RGAN-60",
    fase: 2,
    nombre: "Reproceso",
    descripcion: "Reingreso de material reprocesado",
    icon: "Repeat",
    gate: false,
  },
  // FASE 3 — Embolsado + PCC + Liberación
  {
    tipo_evento: "EV_PRODUCCION_ENVASADO",
    rgan: "RGAN-57",
    fase: 3,
    nombre: "Procesamiento de Granos",
    descripcion: "Embolsado: cantidad de bolsas producidas",
    icon: "Package",
    gate: false,
  },
  {
    tipo_evento: "EV_CONTROL_PESO_BOLSAS",
    rgan: "RGAN-42",
    fase: 3,
    nombre: "Peso de Bolsas",
    descripcion: "5 mediciones de peso por pallet",
    icon: "Scale",
    gate: false,
  },
  {
    tipo_evento: "EV_PCC_DETECTOR_METALES",
    rgan: "RGAN-81",
    fase: 3,
    nombre: "PCC Detector de Metales",
    descripcion: "Punto Crítico de Control — GATE de inocuidad",
    icon: "Magnet",
    gate: true,
  },
  {
    tipo_evento: "EV_PRODUCTO_FINAL_ESTIBA",
    rgan: "RGAN-43",
    fase: 3,
    nombre: "Producto Final / Estiba",
    descripcion: "Control inicial y mensual: temp, humedad, roedores",
    icon: "Warehouse",
    gate: false,
  },
  {
    tipo_evento: "EV_LIBERACION_PRODUCTO",
    rgan: "RGAN-104",
    fase: 3,
    nombre: "Liberación de Producto",
    descripcion: "GATE CRÍTICO — autorización de consumo humano",
    icon: "ShieldCheck",
    gate: true,
  },
  // FASE 4 — Despacho
  {
    tipo_evento: "EV_REMITO_DESPACHO",
    rgan: "RGAN-56",
    fase: 4,
    nombre: "Registro de Despacho",
    descripcion: "Salida del producto terminado",
    icon: "Ship",
    gate: false,
  },
  {
    tipo_evento: "EV_CHECKLIST_CARGA",
    rgan: "RGAN-74",
    fase: 4,
    nombre: "Checklist de Carga",
    descripcion: "15 controles pre-carga del transporte",
    icon: "ClipboardCheck",
    gate: false,
  },
  {
    tipo_evento: "EV_RECEPCION_INSUMOS",
    rgan: "RGAN-21",
    fase: 4,
    nombre: "Recepción de Insumos",
    descripcion: "Ingreso de envases al stock",
    icon: "Boxes",
    gate: false,
  },
];

// Algunos tipo_evento se reutilizan entre RGANs. Ej.: EV_CONTROL_CALIDAD_MP lo
// emiten tanto RGAN-38 Parte 2 como RGAN-39 (Calidad de Ingreso). Se desambigua
// por datos_evento.codigo_rgan.
const RGAN_OVERRIDES: Record<string, Partial<EventDefinition>> = {
  "RGAN-39": { rgan: "RGAN-39", nombre: "Calidad de Ingreso", icon: "FlaskConical", grupo: undefined },
};

/** Definición de presentación para un evento, considerando codigo_rgan. */
export function defForEvent(evt: Pick<TrazEvento, "tipo_evento" | "datos">): EventDefinition | undefined {
  const base = EVENT_DEFINITIONS.find((d) => d.tipo_evento === evt.tipo_evento);
  if (!base) return base;
  const d = evt.datos || {};
  const codigoRgan = (d.codigo_rgan as string | undefined) || undefined;

  // RGAN-39 (Calidad de Ingreso) reusa el tipo EV_CONTROL_CALIDAD_MP de RGAN-38 P2.
  // La etiqueta explícita del bot manda: desde 2026-07-29 el workflow graba
  // codigo_rgan según el punto de entrada real. La heurística por firma de datos
  // queda solo para filas viejas sin etiqueta (el formulario de ingreso también
  // se usa para la Parte 2, así que kgs_netos por sí solo no implica RGAN-39).
  if (evt.tipo_evento === "EV_CONTROL_CALIDAD_MP") {
    if (codigoRgan === "RGAN-39") return { ...base, ...RGAN_OVERRIDES["RGAN-39"] };
    if (!codigoRgan) {
      const esIngreso = d.kgs_netos != null || d.caida_total_kg != null || d.calidad_grano != null;
      if (esIngreso) return { ...base, ...RGAN_OVERRIDES["RGAN-39"] };
    }
  }

  if (codigoRgan && codigoRgan !== base.rgan && RGAN_OVERRIDES[codigoRgan]) {
    return { ...base, ...RGAN_OVERRIDES[codigoRgan] };
  }
  return base;
}

export const GRAIN_NAMES: Record<string, string> = {
  SES: "Sésamo",
  CHI: "Chía",
  PVR: "Pisingallo",
  MUN: "Mung",
  BLE: "Black Eyed",
  PNR: "Poroto Negro",
  PCO: "Poroto Colorado",
  PAD: "Poroto Adzuki",
  PCR: "Poroto Cranberry",
  PBL: "Poroto Blanco",
};

export const FASE_NAMES: Record<number, string> = {
  1: "Recepción",
  2: "Procesamiento",
  3: "Embolsado + PCC + Liberación",
  4: "Despacho",
};
