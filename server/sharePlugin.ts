/**
 * LocalTube network sharing (Phase B, first step).
 *
 * Runs inside the Vite dev/preview server on the machine that owns the files.
 * Roots listed in `localtube.shared.json` are exposed read-only to every device
 * on the local network (no account needed). Real disk paths never leave this
 * process: clients only receive opaque ids and relative folder names.
 *
 *   GET    /api/share/info            LAN addresses + whether caller may manage
 *   GET    /api/share/items           every shared root with its media list
 *   GET    /api/share/file?id=<id>    streams one file (HTTP Range supported)
 *   POST   /api/share/roots           add/replace a root  (this machine only)
 *   DELETE /api/share/roots?key=<k>   stop sharing a root (this machine only)
 */

import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

interface SharedRoot {
  key: string;
  label?: string;
  path: string;
}

interface SharedFile {
  id: string;
  name: string;
  dir: string[];
  size: number;
  mtime: number;
  ext: string;
}

const MEDIA = new Set([
  "mp4", "m4v", "mkv", "webm", "mov", "avi", "mpeg", "mpg", "ts", "m2ts", "mts", "flv", "f4v", "3gp", "ogv",
  "wmv", "asf", "vob", "divx", "rm", "rmvb",
  "mp3", "aac", "m4a", "m4b", "flac", "wav", "opus", "ogg", "oga", "wma", "aiff", "ape", "mka", "amr", "ac3",
]);

const MIME: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", ogv: "video/ogg",
  mkv: "video/x-matroska", "3gp": "video/3gpp", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac",
  flac: "audio/flac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg",
};

const CONFIG = path.resolve(process.cwd(), "localtube.shared.json");
const CACHE_MS = 30_000;

let cache: { at: number; roots: { key: string; label?: string; items: SharedFile[] }[] } | null = null;
const files = new Map<string, string>();

function readConfig(): SharedRoot[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((r) => r && r.key && r.path) : [];
  } catch {
    return [];
  }
}

function writeConfig(roots: SharedRoot[]) {
  fs.writeFileSync(CONFIG, JSON.stringify(roots, null, 2));
  cache = null;
}

function idFor(key: string, rel: string): string {
  return "n" + crypto.createHash("sha1").update(`${key}\0${rel}`).digest("base64url").slice(0, 11);
}

async function walk(root: SharedRoot, dir: string[], out: SharedFile[], depth = 0) {
  if (depth > 12 || out.length > 50_000) return;
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(path.join(root.path, ...dir), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("$")) continue;
    if (entry.isDirectory()) {
      await walk(root, [...dir, entry.name], out, depth + 1);
      continue;
    }
    const ext = entry.name.includes(".") ? entry.name.split(".").pop()!.toLowerCase() : "";
    if (!entry.isFile() || !MEDIA.has(ext)) continue;
    const abs = path.join(root.path, ...dir, entry.name);
    try {
      const stat = await fsp.stat(abs);
      const id = idFor(root.key, [...dir, entry.name].join("/"));
      files.set(id, abs);
      out.push({ id, name: entry.name, dir, size: stat.size, mtime: stat.mtimeMs, ext });
    } catch {
      /* unreadable file: skipped */
    }
  }
}

async function listing() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.roots;
  files.clear();
  const roots = [];
  for (const root of readConfig()) {
    const items: SharedFile[] = [];
    await walk(root, [], items);
    roots.push({ key: root.key, label: root.label, items });
  }
  cache = { at: Date.now(), roots };
  return roots;
}

function isLocal(request: IncomingMessage) {
  const address = request.socket.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const entry of list ?? []) {
      if (entry.family === "IPv4" && !entry.internal) out.push(entry.address);
    }
  }
  return out;
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

async function streamFile(request: IncomingMessage, response: ServerResponse, id: string) {
  if (!files.has(id)) await listing();
  const abs = files.get(id);
  if (!abs) return json(response, 404, { error: "not_found" });
  let size: number;
  try {
    size = (await fsp.stat(abs)).size;
  } catch {
    return json(response, 404, { error: "not_found" });
  }
  const ext = abs.split(".").pop()!.toLowerCase();
  response.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Cache-Control", "private, max-age=3600");
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.range ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      response.statusCode = 416;
      response.setHeader("Content-Range", `bytes */${size}`);
      return response.end();
    }
    response.statusCode = 206;
    response.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    response.setHeader("Content-Length", String(end - start + 1));
    if (request.method === "HEAD") return response.end();
    return fs.createReadStream(abs, { start, end }).pipe(response);
  }
  response.statusCode = 200;
  response.setHeader("Content-Length", String(size));
  if (request.method === "HEAD") return response.end();
  fs.createReadStream(abs).pipe(response);
}

type Next = () => void;

function handler(port: () => number) {
  return async (request: IncomingMessage, response: ServerResponse, next: Next) => {
    const url = new URL(request.url ?? "/", "http://local");
    if (!url.pathname.startsWith("/api/share/")) return next();
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    response.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      return response.end();
    }
    try {
      const route = url.pathname.slice("/api/share/".length);
      if (route === "info") {
        return json(response, 200, { addresses: lanAddresses(), port: port(), canManage: isLocal(request) });
      }
      if (route === "items") return json(response, 200, { roots: await listing() });
      if (route === "file") return await streamFile(request, response, url.searchParams.get("id") ?? "");
      if (route === "roots") {
        if (request.method === "GET") {
          if (!isLocal(request)) return json(response, 403, { error: "forbidden" });
          return json(response, 200, { roots: readConfig() });
        }
        if (!isLocal(request)) return json(response, 403, { error: "forbidden" });
        if (request.method === "POST") {
          const body = (await readBody(request)) as Partial<SharedRoot>;
          const key = String(body.key ?? "").trim().slice(0, 40);
          const target = String(body.path ?? "").trim();
          if (!key || !target) return json(response, 400, { error: "missing" });
          const stat = await fsp.stat(target).catch(() => null);
          if (!stat?.isDirectory()) return json(response, 400, { error: "not_a_folder" });
          const roots = readConfig().filter((r) => r.key !== key);
          roots.push({ key, label: body.label ? String(body.label).slice(0, 80) : undefined, path: target });
          writeConfig(roots);
          return json(response, 200, { ok: true });
        }
        if (request.method === "DELETE") {
          const key = url.searchParams.get("key") ?? "";
          writeConfig(readConfig().filter((r) => r.key !== key));
          return json(response, 200, { ok: true });
        }
      }
      return json(response, 404, { error: "unknown" });
    } catch (error) {
      return json(response, 500, { error: String(error) });
    }
  };
}

export function localTubeShare(): Plugin {
  return {
    name: "localtube-share",
    configureServer(server) {
      server.middlewares.use(handler(() => server.config.server.port ?? 8080));
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler(() => server.config.preview.port ?? 4173));
    },
  };
}
