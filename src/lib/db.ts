import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL || "";
// Supabase pooler on port 6543 requires pgbouncer mode
const dbUrl = rawUrl.includes("pooler.supabase.com")
  ? rawUrl + (rawUrl.includes("?") ? "&" : "?") + "pgbouncer=true"
  : rawUrl;

const pool = new Pool({
  connectionString: dbUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

import type { PoolClient } from "pg";

/** Ejecuta `fn` dentro de una transacción (BEGIN/COMMIT, ROLLBACK ante error). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Cache de existencia de columnas para degradar con gracia si una migración
// (ej. F0_002 inmutabilidad) todavía no se aplicó en la BD.
const colCache = new Map<string, boolean>();
export async function tableHasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  if (colCache.has(key)) return colCache.get(key)!;
  try {
    const rows = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2
       ) AS exists`,
      [table, column]
    );
    const exists = !!rows[0]?.exists;
    colCache.set(key, exists);
    return exists;
  } catch {
    return false;
  }
}

/** Filtro SQL para excluir eventos anulados/supersedidos (si el esquema lo soporta). */
export async function vigenteFilter(alias = "e"): Promise<string> {
  const has = await tableHasColumn("traz_eventos", "estado_evento");
  if (!has) return "";
  return ` AND ${alias}.estado_evento <> 'ANULADO' AND ${alias}.superseded_by IS NULL`;
}

export { pool };
