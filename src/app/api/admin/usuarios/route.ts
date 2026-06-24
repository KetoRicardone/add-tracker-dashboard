import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function guard() {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });
  return null;
}

// Lista completa de usuarios (solo admin).
export async function GET() {
  const err = guard();
  if (err) return err;
  try {
    const usuarios = await query(
      `SELECT usuario_id, nombre, telegram_id::text AS telegram_id, rol::text AS rol,
              COALESCE(activo, true) AS activo,
              COALESCE(bloqueado, false) AS bloqueado,
              COALESCE(pin_bloqueado, false) AS pin_bloqueado,
              COALESCE(requiere_cambio_pin, false) AS requiere_cambio_pin,
              (clave_firma_hash IS NOT NULL) AS tiene_pin,
              ultimo_acceso, creado_en
       FROM usuarios
       ORDER BY nombre`
    );
    const roles = await query<{ rol: string }>(`SELECT unnest(enum_range(NULL::rol_usuario))::text AS rol`);
    return NextResponse.json({ ok: true, usuarios, roles: roles.map((r) => r.rol) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Alta de usuario. El PIN lo crea el propio usuario desde el bot (requiere_cambio_pin = true).
export async function POST(req: NextRequest) {
  const err = guard();
  if (err) return err;
  let body: { nombre?: string; rol?: string; telegram_id?: string | number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const nombre = (body.nombre || "").trim();
  const rol = (body.rol || "").trim();
  const telRaw = body.telegram_id != null ? String(body.telegram_id).trim() : "";
  if (!nombre || !rol) {
    return NextResponse.json({ ok: false, error: "Nombre y rol son obligatorios" }, { status: 400 });
  }
  if (telRaw && !/^\d+$/.test(telRaw)) {
    return NextResponse.json({ ok: false, error: "El telegram_id debe ser numérico" }, { status: 400 });
  }
  try {
    const rows = await query<{ usuario_id: string }>(
      `INSERT INTO usuarios (nombre, rol, telegram_id, activo, requiere_cambio_pin)
       VALUES ($1, $2::rol_usuario, $3, true, true)
       RETURNING usuario_id`,
      [nombre, rol, telRaw ? telRaw : null]
    );
    return NextResponse.json({ ok: true, usuario_id: rows[0]?.usuario_id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ ok: false, error: "Ya existe un usuario con ese telegram_id" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
