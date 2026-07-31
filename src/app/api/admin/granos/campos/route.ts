import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Campos de calidad por grano (granos_campos_calidad, F0_016): son las preguntas
// que el bot hace en RGAN-39 y qué defectos suman a la caída total. Agregar un
// grano nuevo sin cargarle campos deja el formulario vacío.

function guard() {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });
  return null;
}

export async function POST(req: NextRequest) {
  const err = guard();
  if (err) return err;
  let body: { codigo_grano?: string; campo_key?: string; etiqueta?: string; suma_caida?: boolean; orden?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const grano = (body.codigo_grano || "").trim().toUpperCase();
  const etiqueta = (body.etiqueta || "").trim();
  let key = (body.campo_key || "").trim().toLowerCase();

  if (!grano || !etiqueta) {
    return NextResponse.json({ ok: false, error: "Grano y etiqueta son obligatorios" }, { status: 400 });
  }
  // La clave se deriva de la etiqueta si no la dan: así queda consistente con
  // las existentes (snake_case + sufijo _pct) y con las labels del panel.
  if (!key) {
    key = etiqueta
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (key && !key.endsWith("_pct")) key = `${key}_pct`;
  }
  if (!/^[a-z][a-z0-9_]{1,60}$/.test(key)) {
    return NextResponse.json({ ok: false, error: "Clave de campo inválida" }, { status: 400 });
  }

  try {
    const orden = Number.isFinite(Number(body.orden))
      ? Number(body.orden)
      : ((await query<{ prox: number }>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS prox FROM granos_campos_calidad WHERE codigo_grano = $1`,
          [grano]
        ))[0]?.prox ?? 1);

    await query(
      `INSERT INTO granos_campos_calidad (codigo_grano, orden, campo_key, etiqueta, suma_caida)
       VALUES ($1, $2, $3, $4, $5)`,
      [grano, orden, key, etiqueta, body.suma_caida !== false]
    );
    return NextResponse.json({ ok: true, campo_key: key, orden });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, error: "Ese campo ya existe para el grano" }, { status: 409 });
    }
    if (/foreign key/i.test(msg)) {
      return NextResponse.json({ ok: false, error: "No existe ese grano" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const err = guard();
  if (err) return err;
  let body: { codigo_grano?: string; campo_key?: string; etiqueta?: string; suma_caida?: boolean; orden?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const grano = (body.codigo_grano || "").trim().toUpperCase();
  const key = (body.campo_key || "").trim().toLowerCase();
  if (!grano || !key) return NextResponse.json({ ok: false, error: "Faltan grano y campo" }, { status: 400 });

  const sets: string[] = [];
  const params: unknown[] = [grano, key];
  if (typeof body.etiqueta === "string" && body.etiqueta.trim()) {
    params.push(body.etiqueta.trim());
    sets.push(`etiqueta = $${params.length}`);
  }
  if (typeof body.suma_caida === "boolean") {
    params.push(body.suma_caida);
    sets.push(`suma_caida = $${params.length}`);
  }
  if (Number.isFinite(Number(body.orden))) {
    params.push(Number(body.orden));
    sets.push(`orden = $${params.length}`);
  }
  if (!sets.length) return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });

  try {
    const rows = await query<{ campo_key: string }>(
      `UPDATE granos_campos_calidad SET ${sets.join(", ")}
        WHERE codigo_grano = $1 AND campo_key = $2
        RETURNING campo_key`,
      params
    );
    if (!rows.length) return NextResponse.json({ ok: false, error: "No existe ese campo" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const err = guard();
  if (err) return err;
  const { searchParams } = new URL(req.url);
  const grano = (searchParams.get("grano") || "").trim().toUpperCase();
  const key = (searchParams.get("campo") || "").trim().toLowerCase();
  if (!grano || !key) return NextResponse.json({ ok: false, error: "Faltan grano y campo" }, { status: 400 });

  try {
    // Los campos son configuración del formulario, no eventos: se pueden borrar.
    // Los valores ya cargados viven dentro de datos_evento y no se tocan.
    const rows = await query<{ campo_key: string }>(
      `DELETE FROM granos_campos_calidad WHERE codigo_grano = $1 AND campo_key = $2 RETURNING campo_key`,
      [grano, key]
    );
    if (!rows.length) return NextResponse.json({ ok: false, error: "No existe ese campo" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
