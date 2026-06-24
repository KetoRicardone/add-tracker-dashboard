import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Lista de usuarios con PIN configurado, para el selector de login.
// Solo expone id + nombre (sin datos sensibles).
export async function GET() {
  try {
    const usuarios = await query<{ usuario_id: string; nombre: string }>(
      `SELECT usuario_id, nombre
       FROM usuarios
       WHERE clave_firma_hash IS NOT NULL AND COALESCE(pin_bloqueado, false) = false
       ORDER BY nombre`
    );
    return NextResponse.json({ usuarios }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ usuarios: [], error: msg }, { status: 200 });
  }
}
