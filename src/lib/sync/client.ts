/**
 * Synced-account client. Talks to the LocalTube main server set at install time
 * in .env (VITE_LOCALTUBE_SERVER). Without it, the same origin is tried; if that
 * server has no database, sync stays off and the app is 100% local.
 */
const TOKEN_KEY = "localtube.sync.token";
const USER_KEY = "localtube.sync.user";
const OPTIONS_KEY = "localtube.sync.options";
const DEVICE_KEY = "localtube.sync.device";
const LAST_KEY = "localtube.sync.last";

export interface SyncUser { id: string; email: string; displayName: string; role: "admin" | "user" }
export interface SyncOptions { settings: boolean; likes: boolean; watchLater: boolean; history: boolean; roots: boolean; views: boolean }
export const DEFAULT_SYNC_OPTIONS: SyncOptions = { settings: true, likes: true, watchLater: true, history: true, roots: false, views: true };

export function serverUrl(): string {
  const configured = (import.meta.env.VITE_LOCALTUBE_SERVER as string | undefined)?.trim();
  return (configured || window.location.origin).replace(/\/+$/, "");
}

export function deviceKey(): string {
  let k = localStorage.getItem(DEVICE_KEY);
  if (!k) { k = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, k); }
  return k;
}

export const syncToken = () => localStorage.getItem(TOKEN_KEY);
export function syncUser(): SyncUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? "null"); } catch { return null; }
}
export function syncOptions(): SyncOptions {
  try { return { ...DEFAULT_SYNC_OPTIONS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "{}") }; } catch { return DEFAULT_SYNC_OPTIONS; }
}
export const setSyncOptions = (o: SyncOptions) => localStorage.setItem(OPTIONS_KEY, JSON.stringify(o));
export const lastSync = () => Number(localStorage.getItem(LAST_KEY) ?? 0) || null;

export class SyncError extends Error { constructor(public code: string, public status: number) { super(code); } }

async function api<T>(path: string, body?: unknown): Promise<T> {
  const token = syncToken();
  let res: Response;
  try {
    res = await fetch(`${serverUrl()}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new SyncError("offline", 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/api/auth/login")) clearLocal();
    throw new SyncError(json.error ?? "server_error", res.status);
  }
  return json as T;
}

function clearLocal() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

export async function serverInfo(): Promise<{ sync: boolean } | null> {
  try { return await api<{ sync: boolean }>("/api/server/info"); } catch { return null; }
}

async function authenticate(path: string, body: Record<string, string>) {
  const r = await api<{ token: string; user: SyncUser }>(path, { ...body, deviceKey: deviceKey(), deviceName: navigator.platform || "device" });
  localStorage.setItem(TOKEN_KEY, r.token);
  localStorage.setItem(USER_KEY, JSON.stringify(r.user));
  return r.user;
}
export const syncRegister = (displayName: string, email: string, password: string) => authenticate("/api/auth/register", { displayName, email, password });
export const syncLogin = (email: string, password: string) => authenticate("/api/auth/login", { email, password });
export async function syncLogout() { try { await api("/api/auth/logout", {}); } catch { /* still sign out here */ } clearLocal(); }

export interface PullResult {
  settings: { settings: Record<string, unknown> } | null;
  likes: { media_id: string; deleted: boolean }[];
  watchLater: { media_id: string; deleted: boolean }[];
  history: { media_id: string; title: string | null; position: number; duration: number | null; at: string }[];
  roots: unknown[];
}
export const syncPull = () => api<PullResult>("/api/sync/pull");
export async function syncPush(payload: Record<string, unknown>) {
  await api("/api/sync/push", { ...payload, deviceKey: deviceKey(), syncOptions: syncOptions() });
  localStorage.setItem(LAST_KEY, String(Date.now()));
}

export function reportView(id: string) { if (syncToken() && syncOptions().views) void api("/api/views", { id }).catch(() => {}); }
export function reportVisit(path: string) { if (syncToken()) void api("/api/visit", { path }).catch(() => {}); }

export interface Ticket { id: string; kind: string; subject: string; status: string; author: string; updated_at: string; messages: { body: string; fromAdmin: boolean; at: string }[] }
export const listTickets = () => api<{ tickets: Ticket[] }>("/api/support").then((r) => r.tickets);
export const createTicket = (kind: string, subject: string, body: string) => api("/api/support", { kind, subject, body });
export const replyTicket = (ticketId: string, body: string, close = false) => api("/api/support/reply", { ticketId, body, close });
export const adminOverview = () => api<any>("/api/admin/overview");
