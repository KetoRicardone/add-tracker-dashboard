import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Maestro único de establecimientos (F0_017). Lo lee el OCR para resolver la
// Procedencia de la Carta de Porte, así que editar acá cambia el bot al instante.

const TIPOS = ["Propio", "Proveedor", "Cliente"];

function guard() {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });
  return null;
}

function validar(codigo: string, nombre: string, tipo: string) {
  if (!codigo || !nombre) return "El código y el nombre son obligatorios";
  if (!/^[A-Z0-9]{1,10}$/.test(codigo)) return "El código debe ser 1-10 caracteres (A-Z, 0-9)";
  if (tipo && !TIPOS.includes(tipo)) return "Tipo inválido";
  return null;
}

export async function GET() {
  const err = guard();
  if (err) return err;
  try {
    const establecimientos = await query(
      `SELECT e.codigo, e.nombre, e.tipo, e.observaciones, e.vigente_hasta,
              (e.vigente_hasta IS NULL OR e.vigente_hasta > now()) AS vigente,
              (SELECT count(*) FROM traz_trazabilidades t
                WHERE t.codigo_establecimiento = e.codigo) AS usos
       FROM establecimientos e
       ORDER BY e.nombre`
    );
    return NextResponse.json({ ok: true, establecimientos, tipos: TIPOS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const err = guard();
  if (err) return err;
  let body: { codigo?: string; nombre?: string; tipo?: string; observaciones?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const codigo = (body.codigo || "").trim().toUpperCase();
  const nombre = (body.nombre || "").trim();
  const tipo = (body.tipo || "").trim();
  const obs = (body.observaciones || "").trim();

  const invalido = validar(codigo, nombre, tipo);
  if (invalido) return NextResponse.json({ ok: false, error: invalido }, { status: 400 });

  try {
    await query(
      `INSERT INTO establecimientos (codigo, nombre, tipo, observaciones)
       VALUES ($1, $2, $3, NULLIF($4, ''))`,
      [codigo, nombre, tipo || null, obs]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, error: `Ya existe un establecimiento con el código ${codigo}` }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const err = guard();
  if (err) return err;
  let body: { codigo?: string; nombre?: string; tipo?: string; observaciones?: string; vigente?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const codigo = (body.codigo || "").trim().toUpperCase();
  if (!codigo) return NextResponse.json({ ok: false, error: "Falta el código" }, { status: 400 });

  // Baja/alta lógica: se cierra la vigencia (ADR-007), nunca se borra la fila —
  // las trazabilidades ya emitidas embeben el código.
  if (typeof body.vigente === "boolean") {
    try {
      await query(
        `UPDATE establecimientos SET vigente_hasta = $2, updated_at = now() WHERE codigo = $1`,
        [codigo, body.vigente ? null : new Date().toISOString()]
      );
      return NextResponse.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const nombre = (body.nombre || "").trim();
  const tipo = (body.tipo || "").trim();
  const obs = (body.observaciones || "").trim();
  const invalido = validar(codigo, nombre, tipo);
  if (invalido) return NextResponse.json({ ok: false, error: invalido }, { status: 400 });

  try {
    const rows = await query<{ codigo: string }>(
      `UPDATE establecimientos
          SET nombre = $2, tipo = $3, observaciones = NULLIF($4, ''), updated_at = now()
        WHERE codigo = $1
        RETURNING codigo`,
      [codigo, nombre, tipo || null, obs]
    );
    if (!rows.length) return NextResponse.json({ ok: false, error: "No existe ese establecimiento" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
