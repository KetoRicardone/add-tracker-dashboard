import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { signSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Login por PIN: valida con el MISMO hash bcrypt que la firma de Telegram
// (pgcrypto crypt()). No se expone si el usuario existe vs PIN incorrecto.
export async function POST(req: NextRequest) {
  try {
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Servidor sin AUTH_SECRET configurado. Seteá la env var en Vercel y redeploy." },
        { status: 500 }
      );
    }
    const { usuario_id, pin } = await req.json();
    if (!usuario_id || !pin) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    const rows = await query<{
      usuario_id: string;
      nombre: string;
      rol: string | null;
      valido: boolean;
      pin_bloqueado: boolean;
    }>(
      `SELECT usuario_id, nombre, rol::text AS rol,
              (clave_firma_hash IS NOT NULL AND crypt($2, clave_firma_hash) = clave_firma_hash) AS valido,
              COALESCE(pin_bloqueado, false) AS pin_bloqueado
       FROM usuarios
       WHERE usuario_id = $1`,
      [usuario_id, pin]
    );

    const u = rows[0];
    if (!u || u.pin_bloqueado || !u.valido) {
      return NextResponse.json({ ok: false, error: "PIN incorrecto o usuario bloqueado" }, { status: 401 });
    }

    const token = signSession({ uid: u.usuario_id, nombre: u.nombre, rol: u.rol });
    const res = NextResponse.json({ ok: true, nombre: u.nombre });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
