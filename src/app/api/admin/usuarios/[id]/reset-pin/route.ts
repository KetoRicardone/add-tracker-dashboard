import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSesion, esAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Resetea el PIN: borra el hash y obliga a recrearlo desde el bot.
// No setea un PIN nuevo (el admin nunca conoce el PIN del usuario).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = getSesion();
  if (!s) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  if (!esAdmin(s)) return NextResponse.json({ ok: false, error: "Requiere rol ADMIN" }, { status: 403 });

  try {
    await query(
      `UPDATE usuarios
       SET clave_firma_hash = NULL,
           requiere_cambio_pin = true,
           pin_intentos_fallidos = 0,
           pin_bloqueado = false
       WHERE usuario_id = $1`,
      [params.id]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
