// Qué firma cerró cada evento.
//
// Hasta Etapa 1.2 el vínculo no existía en la base y el panel lo adivinaba con
// `firmas.find(f => f.evento_tipo === evt.tipo_evento)`: se quedaba con la
// PRIMERA firma de ese tipo y se la ponía a todos los eventos del tipo. Sobre
// datos reales eso da atribuciones falsas — 1COM-CHI-2526 tiene 4 eventos
// EV_INGRESO_A_PROCESO y una sola firma, y la única firma EV_CONTROL_PROCESO
// del lote es 12 días anterior al único evento vivo de ese tipo (pertenece a
// uno anulado, que la ficha ya no muestra).
//
// Ningún criterio de reconstrucción es sano: ni el orden, ni la cercanía en el
// tiempo, ni la unicidad — los tres fallan en los casos de arriba. Los eventos
// son inmutables (ADR-009), así que lo perdido está perdido. Se muestra el
// firmante únicamente cuando el evento trae `firma_auditoria_id`, que los
// workflows graban desde Etapa 1.2. Las firmas sin vínculo no desaparecen: se
// siguen listando completas en "Firmas y aprobaciones".

import { Firma, TrazEvento } from "./types";

export interface FirmaDeEvento {
  firmante: string;
  fecha: string;
}

/** evento_id → firma que lo cerró. Sólo vínculos explícitos. */
export function asignarFirmas(
  eventos: TrazEvento[],
  firmas: Firma[]
): Map<string, FirmaDeEvento> {
  const porId = new Map<string, Firma>();
  for (const f of firmas) if (f.auditoria_id) porId.set(f.auditoria_id, f);

  const porEvento = new Map<string, FirmaDeEvento>();
  for (const e of eventos) {
    const f = e.firma_auditoria_id ? porId.get(e.firma_auditoria_id) : undefined;
    if (f) porEvento.set(e.evento_id, { firmante: f.firmante, fecha: f.fecha });
  }
  return porEvento;
}

/** auditoria_id → evento que la firma cerró. Sirve para que la lista de firmas
 *  diga sobre qué paso concreto se firmó, en vez de repetir el tipo. */
export function eventoPorFirma(eventos: TrazEvento[]): Map<string, TrazEvento> {
  const m = new Map<string, TrazEvento>();
  for (const e of eventos) if (e.firma_auditoria_id) m.set(e.firma_auditoria_id, e);
  return m;
}

/** Firmas del lote que no quedaron atadas a ningún evento. */
export function firmasSinVinculo(eventos: TrazEvento[], firmas: Firma[]): Firma[] {
  const vinculadas = eventoPorFirma(eventos);
  return firmas.filter((f) => !f.auditoria_id || !vinculadas.has(f.auditoria_id));
}
