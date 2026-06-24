import crypto from "crypto";
import { cookies } from "next/headers";

// Sesión de operador para acciones auditadas (anular/corregir).
// Cookie firmada con HMAC-SHA256 (sin dependencias externas). El actor
// (usuario_id) queda registrado en traz_eventos_anulaciones.

const COOKIE = "add_sesion";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export interface Sesion {
  uid: string; // usuario_id
  nombre: string;
  rol?: string | null;
  exp: number;
}

function secret(): string {
  return process.env.AUTH_SECRET || "";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signSession(data: Omit<Sesion, "exp">): string {
  const payload: Sesion = { ...data, exp: Date.now() + TTL_MS };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyToken(token: string | undefined): Sesion | null {
  if (!token || !secret()) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const sesion = JSON.parse(fromB64url(body).toString("utf8")) as Sesion;
    if (!sesion.exp || sesion.exp < Date.now()) return null;
    return sesion;
  } catch {
    return null;
  }
}

/** Lee la sesión desde la cookie (server-side). */
export function getSesion(): Sesion | null {
  return verifyToken(cookies().get(COOKIE)?.value);
}

// Roles con acceso al panel de administración (gestión de usuarios y permisos).
export const ADMIN_ROLES = ["ADMIN", "SISTEMAS"];

/** True si la sesión corresponde a un rol administrador. */
export function esAdmin(s: Sesion | null): boolean {
  return !!s && ADMIN_ROLES.includes(s.rol || "");
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_TTL_MS = TTL_MS;
