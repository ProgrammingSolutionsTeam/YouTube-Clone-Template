/**
 * LocalTube main server: synced accounts, sync, support, admin, visits.
 * Runs as Vite middleware on the machine the admin installs (dev or `vite preview`).
 *
 *   GET  /api/server/info
 *   POST /api/auth/register | /api/auth/login | /api/auth/logout   GET /api/auth/me
 *   GET  /api/sync/pull      POST /api/sync/push
 *   POST /api/visit          POST /api/views
 *   GET/POST /api/support    POST /api/support/reply
 *   GET  /api/admin/overview
 */
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";
import { configureDb, dbConfigured, sql, tx, type Statement } from "./db";

const SESSION_DAYS = 30;
const MAX_BODY = 2 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCOPES = ["settings", "likes", "watchLater", "history", "roots"] as const;

type Req = IncomingMessage & { body?: any };
interface Authed { userId: string; role: string; email: string; displayName: string; sessionId: string }

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function readBody(req: Req): Promise<any> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { reject(Object.assign(new Error("bad json"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

const ip = (req: IncomingMessage) => String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
const ua = (req: IncomingMessage) => String(req.headers["user-agent"] ?? "").slice(0, 300);
const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64");
  const got = crypto.scryptSync(password, Buffer.from(salt, "base64"), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}

async function audit(userId: string | null, category: string, message: string, details?: unknown, level = "INFO") {
  try {
    await sql("insert into audit_log (user_id, level, category, message, details) values ($1,$2,$3,$4,$5)",
      [userId, level, category, message, details ?? null]);
  } catch { /* logging must never break a request */ }
}

async function authed(req: IncomingMessage): Promise<Authed | null> {
  const header = String(req.headers.authorization ?? "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const rows = await sql<any>(
    `update sessions s set last_used_at = now() from users u
      where s.token_hash = $1 and s.user_id = u.id and s.revoked_at is null and s.expires_at > now() and not u.disabled
      returning s.id as session_id, u.id, u.role, u.email, u.display_name`, [sha(token)]);
  const r = rows[0];
  return r ? { userId: r.id, role: r.role, email: r.email, displayName: r.display_name, sessionId: r.session_id } : null;
}

async function startSession(req: Req, user: any, deviceKey: string, deviceName: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const [, , rows] = await tx([
    { query: `insert into devices (user_id, device_key, name, user_agent, last_ip) values ($1,$2,$3,$4,$5)
              on conflict (user_id, device_key) do update set last_seen_at = now(), last_ip = excluded.last_ip, user_agent = excluded.user_agent`,
      params: [user.id, deviceKey, deviceName || null, ua(req), ip(req)] },
    { query: "update users set last_login_at = now() where id = $1", params: [user.id] },
    { query: `insert into sessions (user_id, device_id, token_hash, ip, user_agent, expires_at)
              values ($1, (select id from devices where user_id = $1 and device_key = $2), $3, $4, $5, now() + ($6 || ' days')::interval) returning id`,
      params: [user.id, deviceKey, sha(token), ip(req), ua(req), String(SESSION_DAYS)] },
  ]);
  void rows;
  return { token, user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } };
}

async function authEvent(userId: string | null, email: string, event: string, success: boolean, req: IncomingMessage) {
  try {
    await sql("insert into auth_events (user_id, email, event, success, ip, user_agent) values ($1,$2,$3,$4,$5,$6)",
      [userId, email, event, success, ip(req), ua(req)]);
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ handlers */

async function register(req: Req, res: ServerResponse) {
  const email = str(req.body.email, 200).toLowerCase();
  const displayName = str(req.body.displayName, 80);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!EMAIL.test(email) || !displayName || password.length < 8 || password.length > 200)
    return send(res, 400, { error: "invalid_input" });
  const exists = await sql("select 1 from users where email = $1", [email]);
  if (exists.length) { await authEvent(null, email, "register", false, req); return send(res, 409, { error: "exists" }); }
  // First account on the main server becomes admin.
  const rows = await sql<any>(
    `insert into users (email, display_name, password_hash, role)
     values ($1,$2,$3, case when exists (select 1 from users) then 'user' else 'admin' end)
     returning id, email, display_name, role`, [email, displayName, hashPassword(password)]);
  await sql("insert into user_settings (user_id) values ($1) on conflict do nothing", [rows[0].id]);
  await authEvent(rows[0].id, email, "register", true, req);
  await audit(rows[0].id, "auth", "account created");
  send(res, 200, await startSession(req, rows[0], str(req.body.deviceKey, 80) || "unknown", str(req.body.deviceName, 80)));
}

async function login(req: Req, res: ServerResponse) {
  const email = str(req.body.email, 200).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const rows = await sql<any>("select id, email, display_name, role, password_hash, disabled from users where email = $1", [email]);
  const user = rows[0];
  if (!user || user.disabled || !verifyPassword(password, user.password_hash)) {
    await authEvent(user?.id ?? null, email, "login", false, req);
    return send(res, 401, { error: "wrong_credentials" });
  }
  await authEvent(user.id, email, "login", true, req);
  send(res, 200, await startSession(req, user, str(req.body.deviceKey, 80) || "unknown", str(req.body.deviceName, 80)));
}

async function pull(me: Authed, res: ServerResponse) {
  const [settings, likes, later, history, roots] = await tx([
    { query: "select settings, sync_options, updated_at from user_settings where user_id = $1", params: [me.userId] },
    { query: "select media_id, title, deleted, (extract(epoch from updated_at)*1000)::bigint as at from likes where user_id = $1", params: [me.userId] },
    { query: "select media_id, title, deleted, (extract(epoch from updated_at)*1000)::bigint as at from watch_later where user_id = $1", params: [me.userId] },
    { query: "select media_id, title, position, duration, deleted, (extract(epoch from watched_at)*1000)::bigint as at from watch_history where user_id = $1 order by watched_at desc limit 1000", params: [me.userId] },
    { query: "select root_key, label, host_url, visibility, item_count from published_roots where user_id = $1", params: [me.userId] },
  ]);
  send(res, 200, { settings: settings[0] ?? null, likes, watchLater: later, history, roots });
}

async function push(me: Authed, req: Req, res: ServerResponse) {
  const b = req.body ?? {};
  const device = str(b.deviceKey, 80) || "unknown";
  const st: Statement[] = [];
  if (b.settings && typeof b.settings === "object") {
    st.push({ query: `insert into user_settings (user_id, settings, sync_options, updated_at, updated_by_device) values ($1,$2,$3,now(),$4)
                      on conflict (user_id) do update set settings = excluded.settings, sync_options = excluded.sync_options, updated_at = now(), updated_by_device = excluded.updated_by_device`,
              params: [me.userId, b.settings, b.syncOptions ?? {}, device] });
  }
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 2000) : []);
  for (const [table, items] of [["likes", list(b.likes)], ["watch_later", list(b.watchLater)]] as const) {
    for (const it of items as any[]) {
      const id = str(it?.id, 40);
      if (!id) continue;
      st.push({ query: `insert into ${table} (user_id, media_id, title, deleted, updated_at) values ($1,$2,$3,$4, to_timestamp($5/1000.0))
                        on conflict (user_id, media_id) do update set title = excluded.title, deleted = excluded.deleted, updated_at = excluded.updated_at
                        where ${table}.updated_at < excluded.updated_at`,
                params: [me.userId, id, str(it.title, 300) || null, Boolean(it.deleted), Number(it.at) || Date.now()] });
    }
  }
  for (const it of list(b.history) as any[]) {
    const id = str(it?.id, 40);
    if (!id) continue;
    st.push({ query: `insert into watch_history (user_id, media_id, title, position, duration, watched_at, updated_at) values ($1,$2,$3,$4,$5, to_timestamp($6/1000.0), now())
                      on conflict (user_id, media_id) do update set title = excluded.title, position = excluded.position, duration = excluded.duration, watched_at = excluded.watched_at, updated_at = now(), deleted = false
                      where watch_history.watched_at < excluded.watched_at`,
              params: [me.userId, id, str(it.title, 300) || null, Number(it.position) || 0, Number(it.duration) || null, Number(it.at) || Date.now()] });
  }
  for (const r of list(b.roots) as any[]) {
    const key = str(r?.key, 60);
    if (!key) continue;
    st.push({ query: `insert into published_roots (user_id, root_key, label, host_url, visibility, item_count) values ($1,$2,$3,$4,$5,$6)
                      on conflict (user_id, root_key) do update set label = excluded.label, host_url = excluded.host_url, visibility = excluded.visibility, item_count = excluded.item_count, updated_at = now()`,
              params: [me.userId, key, str(r.label, 120) || null, str(r.hostUrl, 300) || null,
                       ["private", "members", "public"].includes(r.visibility) ? r.visibility : "members", Math.max(0, Number(r.itemCount) || 0)] });
  }
  for (const scope of SCOPES) {
    st.push({ query: `insert into sync_state (user_id, device_key, scope, last_pushed_at) values ($1,$2,$3,now())
                      on conflict (user_id, device_key, scope) do update set last_pushed_at = now()`, params: [me.userId, device, scope] });
  }
  // Batches in chunks so very large libraries never exceed request limits.
  for (let i = 0; i < st.length; i += 300) await tx(st.slice(i, i + 300));
  await audit(me.userId, "sync", "push", { device, statements: st.length });
  send(res, 200, { ok: true, at: Date.now() });
}

async function support(me: Authed, req: Req, res: ServerResponse) {
  if (req.method === "GET") {
    const admin = me.role === "admin";
    const tickets = await sql(
      `select t.id, t.kind, t.subject, t.status, t.created_at, t.updated_at, u.display_name as author,
              coalesce((select json_agg(json_build_object('body', m.body, 'fromAdmin', m.from_admin, 'at', m.created_at) order by m.created_at)
                        from ticket_messages m where m.ticket_id = t.id), '[]') as messages
         from support_tickets t left join users u on u.id = t.user_id
        where $1 or t.user_id = $2 order by t.updated_at desc limit 200`, [admin, me.userId]);
    return send(res, 200, { tickets });
  }
  const kind = ["support", "suggestion", "complaint"].includes(req.body.kind) ? req.body.kind : "support";
  const subject = str(req.body.subject, 160);
  const body = str(req.body.body, 5000);
  if (!subject || !body) return send(res, 400, { error: "invalid_input" });
  const [rows] = await tx([
    { query: "insert into support_tickets (user_id, kind, subject) values ($1,$2,$3) returning id", params: [me.userId, kind, subject] },
  ]);
  await sql("insert into ticket_messages (ticket_id, author_id, body) values ($1,$2,$3)", [rows[0].id, me.userId, body]);
  await audit(me.userId, "support", `new ${kind}`);
  send(res, 200, { id: rows[0].id });
}

async function reply(me: Authed, req: Req, res: ServerResponse) {
  const id = str(req.body.ticketId, 40);
  const body = str(req.body.body, 5000);
  if (!id || !body) return send(res, 400, { error: "invalid_input" });
  const owned = await sql<any>("select user_id from support_tickets where id = $1", [id]);
  if (!owned[0] || (owned[0].user_id !== me.userId && me.role !== "admin")) return send(res, 404, { error: "not_found" });
  const fromAdmin = me.role === "admin" && owned[0].user_id !== me.userId;
  const status = req.body.close ? "closed" : fromAdmin ? "answered" : "open";
  await tx([
    { query: "insert into ticket_messages (ticket_id, author_id, from_admin, body) values ($1,$2,$3,$4)", params: [id, me.userId, fromAdmin, body] },
    { query: "update support_tickets set status = $2, updated_at = now() where id = $1", params: [id, status] },
  ]);
  send(res, 200, { ok: true });
}

async function adminOverview(me: Authed, res: ServerResponse) {
  if (me.role !== "admin") return send(res, 403, { error: "forbidden" });
  const [counts, users, visits, logs, auth] = await tx([
    { query: `select (select count(*) from users) as users, (select count(*) from sessions where revoked_at is null and expires_at > now()) as sessions,
                     (select count(*) from visits where created_at > now() - interval '1 day') as visits_today,
                     (select count(*) from support_tickets where status = 'open') as open_tickets` },
    { query: "select email, display_name, role, created_at, last_login_at from users order by created_at desc limit 100" },
    { query: "select path, ip, created_at from visits order by created_at desc limit 50" },
    { query: "select level, category, message, created_at from audit_log order by created_at desc limit 50" },
    { query: "select email, event, success, ip, created_at from auth_events order by created_at desc limit 50" },
  ]);
  send(res, 200, { counts: counts[0], users, visits, logs, auth });
}

/* -------------------------------------------------------------------- plugin */

async function route(req: Req, res: ServerResponse, url: URL): Promise<boolean> {
  const p = url.pathname;
  if (!/^\/api\/(server|auth|sync|support|admin|visit|views)/.test(p)) return false;
  cors(req, res);
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return true; }
  if (p === "/api/server/info") { send(res, 200, { name: "LocalTube", sync: dbConfigured() }); return true; }
  if (!dbConfigured()) { send(res, 503, { error: "not_configured" }); return true; }
  if (req.method === "POST") req.body = await readBody(req);

  if (p === "/api/auth/register" && req.method === "POST") { await register(req, res); return true; }
  if (p === "/api/auth/login" && req.method === "POST") { await login(req, res); return true; }
  if (p === "/api/visit" && req.method === "POST") {
    const me = await authed(req);
    await sql("insert into visits (user_id, path, ip, user_agent) values ($1,$2,$3,$4)", [me?.userId ?? null, str(req.body.path, 200) || "/", ip(req), ua(req)]);
    send(res, 200, { ok: true }); return true;
  }
  if (p === "/api/views" && req.method === "POST") {
    const id = str(req.body.id, 40);
    if (id) await sql("insert into view_counts (media_id, views) values ($1,1) on conflict (media_id) do update set views = view_counts.views + 1, updated_at = now()", [id]);
    send(res, 200, { ok: true }); return true;
  }

  const me = await authed(req);
  if (!me) { send(res, 401, { error: "unauthorized" }); return true; }
  if (p === "/api/auth/me") send(res, 200, { user: { id: me.userId, email: me.email, displayName: me.displayName, role: me.role } });
  else if (p === "/api/auth/logout") {
    await sql("update sessions set revoked_at = now() where id = $1", [me.sessionId]);
    await authEvent(me.userId, me.email, "logout", true, req);
    send(res, 200, { ok: true });
  }
  else if (p === "/api/sync/pull") await pull(me, res);
  else if (p === "/api/sync/push" && req.method === "POST") await push(me, req, res);
  else if (p === "/api/support/reply" && req.method === "POST") await reply(me, req, res);
  else if (p === "/api/support") await support(me, req, res);
  else if (p === "/api/admin/overview") await adminOverview(me, res);
  else send(res, 404, { error: "not_found" });
  return true;
}

export function localTubeSync(env: Record<string, string | undefined>): Plugin {
  configureDb(env);
  const middleware = (req: Req, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    route(req, res, url).then((handled) => { if (!handled) next(); }).catch((err) => {
      console.error("[localtube sync]", err?.message ?? err);
      if (!res.headersSent) send(res, err?.status ?? 500, { error: err?.status === 400 ? "invalid_input" : "server_error" });
    });
  };
  return {
    name: "localtube-sync",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
