/**
 * Network roots: media shared by LocalTube servers on the local network.
 *
 * The app asks its own server (same origin) plus any peer addresses the user
 * added. Shared items are merged into the library in memory only — they are
 * never written into the local index, so removing a share makes them vanish.
 */

import type { MediaItem, RootRecord } from "../core/types";
import { canBrowserProbablyPlay, guessMime, kindFromExtension } from "../core/formats";

interface SharedFile {
  id: string;
  name: string;
  dir: string[];
  size: number;
  mtime: number;
  ext: string;
}

export interface ShareInfo {
  addresses: string[];
  port: number;
  canManage: boolean;
}

const PEERS_KEY = "localtube.peers";
const CACHE_MS = 30_000;
const NET_PREFIX = "net:";

let cache: { at: number; items: MediaItem[]; roots: RootRecord[] } | null = null;
let pending: Promise<{ items: MediaItem[]; roots: RootRecord[] }> | null = null;
const origins = new Map<string, string>();

export function isNetworkItem(item: Pick<MediaItem, "rootId">): boolean {
  return item.rootId.startsWith(NET_PREFIX);
}

export function getPeers(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(PEERS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function normalizePeer(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    if (!url.port && !/^https?:\/\//i.test(raw)) url.port = "8080";
    return url.origin;
  } catch {
    return null;
  }
}

export function setPeers(peers: string[]) {
  window.localStorage.setItem(PEERS_KEY, JSON.stringify([...new Set(peers)]));
  invalidateNetwork();
}

export function invalidateNetwork() {
  cache = null;
}

async function getJson<T>(url: string, init?: RequestInit, timeout = 4000): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function shareInfo(origin = window.location.origin): Promise<ShareInfo | null> {
  return getJson<ShareInfo>(`${origin}/api/share/info`);
}

export async function listServerShares(): Promise<{ key: string; label?: string; path: string }[]> {
  const body = await getJson<{ roots: { key: string; label?: string; path: string }[] }>("/api/share/roots");
  return body?.roots ?? [];
}

export async function addServerShare(root: { key: string; label?: string; path: string }): Promise<string | null> {
  try {
    const response = await fetch("/api/share/roots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(root),
    });
    invalidateNetwork();
    if (response.ok) return null;
    const body = await response.json().catch(() => ({}));
    return String(body.error ?? response.status);
  } catch {
    return "offline";
  }
}

export async function removeServerShare(key: string): Promise<void> {
  await fetch(`/api/share/roots?key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => undefined);
  invalidateNetwork();
}

function toItem(origin: string, rootKey: string, file: SharedFile): MediaItem {
  const kind = kindFromExtension(file.name) === "audio" ? "audio" : "video";
  const title = file.name.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").trim();
  const rootId = `${NET_PREFIX}${origin}|${rootKey}`;
  origins.set(file.id, origin);
  return {
    id: file.id,
    rootId,
    rootName: rootKey,
    kind,
    title,
    fileName: file.name,
    dirPath: file.dir,
    channel: file.dir[0] ?? rootKey,
    channelId: `${rootId}/${file.dir[0] ?? ""}`,
    playlist: file.dir.length > 1 ? file.dir[file.dir.length - 1] : null,
    playlistId: file.dir.length > 1 ? `${rootId}/${file.dir.join("/")}` : null,
    extension: file.ext,
    container: file.ext,
    mimeType: guessMime(kind, file.ext),
    detectionConfidence: "extension",
    size: file.size,
    fileModifiedAt: file.mtime,
    indexedAt: Date.now(),
    available: true,
    directPlay: canBrowserProbablyPlay(kind, file.ext),
    hasThumbnail: false,
    probed: false,
    subtitles: [],
    qualities: [],
    tags: [],
    search: `${title} ${file.dir.join(" ")} ${rootKey}`.toLowerCase(),
  };
}

async function load(): Promise<{ items: MediaItem[]; roots: RootRecord[] }> {
  const sources = [window.location.origin, ...getPeers().filter((p) => p !== window.location.origin)];
  const results = await Promise.all(
    sources.map(async (origin) => ({
      origin,
      body: await getJson<{ roots: { key: string; label?: string; items: SharedFile[] }[] }>(`${origin}/api/share/items`, undefined, 8000),
    })),
  );
  const items: MediaItem[] = [];
  const roots: RootRecord[] = [];
  const usedKeys = new Set<string>();
  for (const { origin, body } of results) {
    if (!body?.roots) continue;
    const self = origin === window.location.origin;
    for (const root of body.roots) {
      let key = self ? root.key : `${root.key}@${new URL(origin).hostname}`;
      while (usedKeys.has(key.toLowerCase())) key += "+";
      usedKeys.add(key.toLowerCase());
      roots.push({
        id: `${NET_PREFIX}${origin}|${root.key}`,
        name: key,
        label: root.label,
        source: "network",
        createdAt: 0,
        itemCount: root.items.length,
      });
      for (const file of root.items) {
        const item = toItem(origin, root.key, file);
        item.rootName = key;
        items.push(item);
      }
    }
  }
  return { items, roots };
}

export async function networkLibrary(): Promise<{ items: MediaItem[]; roots: RootRecord[] }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  if (!pending) {
    pending = load()
      .then((result) => {
        cache = { at: Date.now(), ...result };
        return result;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function networkFileUrl(item: Pick<MediaItem, "id" | "rootId">): string {
  const origin = origins.get(item.id) ?? item.rootId.slice(NET_PREFIX.length).split("|")[0];
  return `${origin}/api/share/file?id=${encodeURIComponent(item.id)}`;
}

/** Keeps probe results (duration, size) for network items in memory only. */
export function patchNetworkItem(updated: MediaItem) {
  if (!cache) return;
  const index = cache.items.findIndex((i) => i.id === updated.id);
  if (index >= 0) cache.items[index] = updated;
}

/** Best link to hand to other people: swaps localhost for the LAN address. */
export async function publicOrigin(): Promise<string> {
  const { hostname, port, protocol, origin } = window.location;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) return origin;
  const info = await shareInfo();
  const address = info?.addresses[0];
  return address ? `${protocol}//${address}${port ? `:${port}` : ""}` : origin;
}
