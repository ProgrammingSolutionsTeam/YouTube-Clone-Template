/**
 * Main-server database access (Neon Postgres over HTTP, no driver needed).
 *
 * Two modes, picked from the server's .env:
 *  1. DATABASE_URL=postgresql://...neon.tech/...   -> Neon's HTTP SQL endpoint directly
 *  2. LOVABLE_API_KEY + NEON_API_KEY                -> Lovable connector gateway
 * Neither value is ever sent to browsers.
 */

export type Row = Record<string, unknown>;
export interface Statement { query: string; params?: unknown[] }

let env: Record<string, string | undefined> = {};
export function configureDb(values: Record<string, string | undefined>) {
  env = { ...process.env, ...values };
}

export function dbConfigured(): boolean {
  return Boolean(env.DATABASE_URL || (env.LOVABLE_API_KEY && env.NEON_API_KEY));
}

async function post(body: unknown): Promise<any> {
  let url: string;
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.DATABASE_URL) {
    const host = new URL(env.DATABASE_URL).hostname;
    url = `https://${host}/sql`;
    headers["Neon-Connection-String"] = env.DATABASE_URL;
  } else if (env.LOVABLE_API_KEY && env.NEON_API_KEY) {
    url = "https://connector-gateway.lovable.dev/neon/sql";
    headers = { ...headers, Authorization: `Bearer ${env.LOVABLE_API_KEY}`, "X-Connection-Api-Key": env.NEON_API_KEY };
  } else {
    throw Object.assign(new Error("database not configured"), { status: 503 });
  }
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { /* keep empty */ }
  if (!res.ok) {
    console.error(`[localtube db] ${res.status}: ${text.slice(0, 300)}`);
    const input = /^2[23]/.test(json?.code ?? "");
    throw Object.assign(new Error(input ? "invalid input" : "database error"), { status: input ? 400 : 503, code: json?.code });
  }
  return json;
}

export async function sql<T extends Row = Row>(query: string, params: unknown[] = []): Promise<T[]> {
  const json = await post({ query, params });
  return (json.rows ?? []) as T[];
}

/** Runs statements in one transaction. */
export async function tx(statements: Statement[]): Promise<Row[][]> {
  if (!statements.length) return [];
  const json = await post({ queries: statements.map((s) => ({ query: s.query, params: s.params ?? [] })) });
  return (json.results ?? []).map((r: any) => r.rows ?? []);
}
