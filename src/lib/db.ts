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

export { pool };
