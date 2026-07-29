import { NextRequest, NextResponse } from "next/server";

// Protección central de rutas: páginas de datos, APIs y manuales exigen la
// cookie de sesión firmada (HMAC-SHA256, ver src/lib/auth.ts). Corre en Edge,
// por eso la verificación usa Web Crypto en lugar de node:crypto.

const COOKIE = "add_sesion";

// Dentro del matcher, estas rutas quedan públicas: login/logout, health check y
// el selector de operadores del propio login (solo id + nombre de quienes
// tienen PIN activo — sin ese listado no se podría iniciar sesión).
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/usuarios"];

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.AUTH_SECRET || "";
  if (!token || !secret) return false;
  const [body, mac] = token.split(".");
  if (!body || !mac) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(mac), enc.encode(body));
    if (!ok) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (await hasValidSession(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Páginas y PDFs: al login (el home muestra LoginRequired sin sesión).
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/manuales/:path*",
    "/trazabilidad/:path*",
    "/eventos/:path*",
    "/admin/:path*",
  ],
};
