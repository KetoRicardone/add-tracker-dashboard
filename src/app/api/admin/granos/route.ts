import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { guardPermiso } from "@/lib/permisos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Maestro de granos (F0_016). El bot lo usa para reconocer el grano de la CP y,
// junto con granos_campos_calidad, para armar el formulario de RGAN-39.

const guard = () => guardPermiso("PANEL_GRANOS");

function validar(codigo: string, nombre: string) {
  if (!codigo || !nombre) return "El código y el nombre son obligatorios";
  if (!/^[A-Z0-9]{2,6}$/.test(codigo)) return "El código debe ser 2-6 caracteres (A-Z, 0-9)";
  return null;
}

export async function GET() {
  const err = await guard();
  if (err) return err;
  try {
    const granos = await query(
      `SELECT g.codigo, g.nombre, g.vida_util_meses, g.observaciones, g.vigente_hasta,
              (g.vigente_hasta IS NULL OR g.vigente_hasta > now()) AS vigente,
              (SELECT count(*) FROM granos_campos_calidad c WHERE c.codigo_grano = g.codigo) AS campos,
              (SELECT count(*) FROM traz_trazabilidades t WHERE t.codigo_grano = g.codigo) AS usos,
              (SELECT p.humedad_pct_max FROM parametros_calidad p
                WHERE p.codigo_grano = g.codigo AND p.vigente_desde <= now()
                  AND (p.vigente_hasta IS NULL OR p.vigente_hasta > now())
                ORDER BY p.vigente_desde DESC LIMIT 1) AS humedad_pct_max
       FROM granos g
       ORDER BY g.nombre`
    );
    const campos = await query(
      `SELECT codigo_grano, orden, campo_key, etiqueta, suma_caida
         FROM granos_campos_calidad
        ORDER BY codigo_grano, orden`
    );
    return NextResponse.json({ ok: true, granos, campos });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const err = await guard();
  if (err) return err;
  let body: { codigo?: string; nombre?: string; vida_util_meses?: number | string; observaciones?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const codigo = (body.codigo || "").trim().toUpperCase();
  const nombre = (body.nombre || "").trim();
  const obs = (body.observaciones || "").trim();
  const vidaRaw = body.vida_util_meses;
  const vida = vidaRaw === "" || vidaRaw == null ? null : Number(vidaRaw);
  if (vida != null && (!Number.isFinite(vida) || vida < 0)) {
    return NextResponse.json({ ok: false, error: "Vida útil inválida" }, { status: 400 });
  }

  const invalido = validar(codigo, nombre);
  if (invalido) return NextResponse.json({ ok: false, error: invalido }, { status: 400 });

  try {
    await query(
      `INSERT INTO granos (codigo, nombre, vida_util_meses, observaciones)
       VALUES ($1, $2, $3, NULLIF($4, ''))`,
      [codigo, nombre, vida, obs]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, error: `Ya existe un grano con el código ${codigo}` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const err = await guard();
  if (err) return err;
  let body: {
    codigo?: string; nombre?: string; vida_util_meses?: number | string;
    observaciones?: string; vigente?: boolean; humedad_pct_max?: number | string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const codigo = (body.codigo || "").trim().toUpperCase();
  if (!codigo) return NextResponse.json({ ok: false, error: "Falta el código" }, { status: 400 });

  // Humedad máxima: vive en parametros_calidad con vigencia temporal (ADR-007).
  // No se pisa la fila: se cierra la vigente y se abre una nueva, porque las
  // validaciones consultan el parámetro vigente a la fecha del evento, no a hoy.
  if (body.humedad_pct_max !== undefined) {
    const crudo = body.humedad_pct_max;
    const limpiar = crudo === "" || crudo === null;
    const valor = limpiar ? null : Number(crudo);
    if (!limpiar && (!Number.isFinite(valor as number) || (valor as number) <= 0 || (valor as number) > 100)) {
      return NextResponse.json({ ok: false, error: "La humedad máxima debe ser un número entre 0 y 100" }, { status: 400 });
    }
    try {
      await query(
        `UPDATE parametros_calidad SET vigente_hasta = now(), updated_at = now()
          WHERE codigo_grano = $1 AND (vigente_hasta IS NULL OR vigente_hasta > now())`,
        [codigo]
      );
      if (!limpiar) {
        await query(
          `INSERT INTO parametros_calidad (codigo_grano, humedad_pct_max, vigente_desde)
           VALUES ($1, $2, now())`,
          [codigo, valor]
        );
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  // Baja lógica por vigencia (ADR-007): las trazabilidades emitidas embeben el código.
  if (typeof body.vigente === "boolean") {
    try {
      await query(
        `UPDATE granos SET vigente_hasta = $2, updated_at = now() WHERE codigo = $1`,
        [codigo, body.vigente ? null : new Date().toISOString()]
      );
      return NextResponse.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const nombre = (body.nombre || "").trim();
  const obs = (body.observaciones || "").trim();
  const vidaRaw = body.vida_util_meses;
  const vida = vidaRaw === "" || vidaRaw == null ? null : Number(vidaRaw);
  if (vida != null && (!Number.isFinite(vida) || vida < 0)) {
    return NextResponse.json({ ok: false, error: "Vida útil inválida" }, { status: 400 });
  }
  const invalido = validar(codigo, nombre);
  if (invalido) return NextResponse.json({ ok: false, error: invalido }, { status: 400 });

  try {
    const rows = await query<{ codigo: string }>(
      `UPDATE granos
          SET nombre = $2, vida_util_meses = $3, observaciones = NULLIF($4, ''), updated_at = now()
        WHERE codigo = $1
        RETURNING codigo`,
      [codigo, nombre, vida, obs]
    );
    if (!rows.length) return NextResponse.json({ ok: false, error: "No existe ese grano" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
