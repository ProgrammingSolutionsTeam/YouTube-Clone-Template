/**
 * Scanner worker.
 *
 * Runs off the main thread so a library with hundreds of thousands of files
 * never blocks the UI, and so a scan is never tied to a request lifetime.
 * It walks the granted directory handle, classifies every file, pairs sidecar
 * subtitles and quality variants, and writes straight into the local index in
 * batches. A single unreadable file or folder is logged and skipped.
 */

import { detect, baseNameOf, extensionOf, canBrowserProbablyPlay, guessMime, detectQualityLabel } from "../core/formats";
import { parseSidecarName, languageLabel } from "../core/languages";
import { publicId } from "../core/ids";
import { subtitleFormat } from "../core/subtitles";
import {
  STORE,
  aliasStore,
  channelsStore,
  cursorEach,
  itemsStore,
  playlistsStore,
  putMany,
  removeMany,
} from "../core/indexdb";
import type {
  ChannelRecord,
  MediaItem,
  PlaylistRecord,
  QualityVariant,
  ScanIssue,
  SubtitleRecord,
} from "../core/types";

interface StartMessage {
  type: "start";
  rootId: string;
  rootName: string;
  handle: FileSystemDirectoryHandle;
  mode: "full" | "incremental";
  /** read file headers for signature sniffing (slower, most accurate) */
  deepDetect: boolean;
}

interface CancelMessage {
  type: "cancel";
}

type Incoming = StartMessage | CancelMessage;

let cancelled = false;

const BATCH_SIZE = 300;
const HEADER_BYTES = 32;

interface DirEntryFile {
  name: string;
  handle: FileSystemFileHandle;
}

interface Counters {
  directoriesSeen: number;
  filesSeen: number;
  mediaFound: number;
  subtitlesFound: number;
  added: number;
  updated: number;
  removed: number;
  renamed: number;
}

function post(message: unknown) {
  (self as unknown as Worker).postMessage(message);
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const data = event.data;
  if (data.type === "cancel") {
    cancelled = true;
    return;
  }
  cancelled = false;
  try {
    await scanRoot(data);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};

async function scanRoot(job: StartMessage) {
  const startedAt = Date.now();
  const counters: Counters = {
    directoriesSeen: 0,
    filesSeen: 0,
    mediaFound: 0,
    subtitlesFound: 0,
    added: 0,
    updated: 0,
    removed: 0,
    renamed: 0,
  };
  const issues: ScanIssue[] = [];

  // Existing state for this root: used for incremental diffing and rename matching.
  const existing = new Map<string, { modifiedAt: number; size: number; probed: boolean }>();
  const fingerprints = new Map<string, string>();
  await cursorEach<MediaItem>(STORE.items, "byRoot", "next", (item) => {
    existing.set(item.id, { modifiedAt: item.fileModifiedAt, size: item.size, probed: item.probed });
    fingerprints.set(`${item.size}:${item.fileModifiedAt}`, item.id);
  }, IDBKeyRange.only(job.rootId));

  const seen = new Set<string>();
  const channels = new Map<string, ChannelRecord>();
  const playlists = new Map<string, PlaylistRecord>();
  let batch: MediaItem[] = [];

  const flush = async () => {
    if (!batch.length) return;
    await itemsStore.putMany(batch);
    batch = [];
  };

  const emitProgress = (currentPath: string) => {
    post({ type: "progress", counters, currentPath, issues: issues.slice(-25), startedAt });
  };

  const walk = async (dir: FileSystemDirectoryHandle, relative: string[]): Promise<number> => {
    if (cancelled) return 0;
    counters.directoriesSeen++;
    if (counters.directoriesSeen % 5 === 0) emitProgress(relative.join("/") || "/");

    const files: DirEntryFile[] = [];
    const subdirs: { name: string; handle: FileSystemDirectoryHandle }[] = [];

    try {
      for await (const [name, handle] of (dir as unknown as {
        entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
      }).entries()) {
        if (cancelled) return 0;
        if (name.startsWith(".") || name === "$RECYCLE.BIN" || name === "System Volume Information") continue;
        if (handle.kind === "directory") {
          subdirs.push({ name, handle: handle as FileSystemDirectoryHandle });
        } else {
          files.push({ name, handle: handle as FileSystemFileHandle });
        }
      }
    } catch (error) {
      issues.push({
        path: relative.join("/") || "/",
        message: error instanceof Error ? error.message : String(error),
        level: "ERROR",
        at: Date.now(),
      });
    }

    let newestInBranch = 0;
    const produced = await classifyDirectory(job, dir, relative, files, {
      counters,
      issues,
      existing,
      fingerprints,
      seen,
      onItem: async (item) => {
        batch.push(item);
        newestInBranch = Math.max(newestInBranch, item.fileModifiedAt);
        if (batch.length >= BATCH_SIZE) await flush();
      },
    });

    // Folder → channel / playlist mapping.
    if (relative.length >= 1) {
      const channelName = relative[0];
      const channelId = publicId(`channel:${job.rootId}`, [channelName]);
      const channel = channels.get(channelId) ?? {
        id: channelId,
        name: channelName,
        rootId: job.rootId,
        rootName: job.rootName,
        itemCount: 0,
        playlistCount: 0,
        lastModifiedAt: 0,
        colorSeed: Math.abs(hashString(channelName)) % 360,
        posterItemId: undefined,
      };
      channel.itemCount += produced.count;
      channel.lastModifiedAt = Math.max(channel.lastModifiedAt, newestInBranch);
      if (!channel.posterItemId && produced.firstId) channel.posterItemId = produced.firstId;
      channels.set(channelId, channel);

      if (relative.length >= 2) {
        const playlistId = publicId(`playlist:${job.rootId}`, relative);
        const playlist = playlists.get(playlistId) ?? {
          id: playlistId,
          name: relative[relative.length - 1],
          channelId,
          channel: channelName,
          rootId: job.rootId,
          path: relative,
          itemCount: 0,
          lastModifiedAt: 0,
        };
        playlist.itemCount += produced.count;
        playlist.lastModifiedAt = Math.max(playlist.lastModifiedAt, newestInBranch);
        playlists.set(playlistId, playlist);
      }
    }

    for (const sub of subdirs) {
      if (cancelled) break;
      try {
        const childNewest = await walk(sub.handle, [...relative, sub.name]);
        newestInBranch = Math.max(newestInBranch, childNewest);
        if (relative.length >= 1) {
          const channelId = publicId(`channel:${job.rootId}`, [relative[0]]);
          const channel = channels.get(channelId);
          if (channel) {
            channel.lastModifiedAt = Math.max(channel.lastModifiedAt, childNewest);
            if (relative.length === 1) channel.playlistCount += 1;
          }
        }
      } catch (error) {
        issues.push({
          path: [...relative, sub.name].join("/"),
          message: error instanceof Error ? error.message : String(error),
          level: "WARNING",
          at: Date.now(),
        });
      }
    }
    return newestInBranch;
  };

  await walk(job.handle, []);
  await flush();

  // Files that vanished from disk. Rename detection first: a disappeared item
  // whose (size, mtime) fingerprint reappeared under a new id is an alias, not
  // a deletion, so history and shared links keep working.
  const missing = [...existing.keys()].filter((id) => !seen.has(id));
  const removedIds: string[] = [];
  for (const id of missing) {
    const meta = existing.get(id)!;
    const replacement = fingerprints.get(`${meta.size}:${meta.modifiedAt}`);
    if (replacement && replacement !== id && seen.has(replacement)) {
      await aliasStore.put(id, replacement);
      counters.renamed++;
    }
    removedIds.push(id);
  }
  if (!cancelled) {
    counters.removed = removedIds.length;
    await removeMany(STORE.items, removedIds);
  }

  if (!cancelled) {
    await putMany(STORE.channels, [...channels.values()]);
    await putMany(STORE.playlists, [...playlists.values()]);
    // Prune channels/playlists that no longer exist for this root.
    await pruneDerived(job.rootId, new Set(channels.keys()), new Set(playlists.keys()));
  }

  post({
    type: cancelled ? "cancelled" : "done",
    counters,
    issues,
    startedAt,
    finishedAt: Date.now(),
  });
}

async function pruneDerived(rootId: string, keepChannels: Set<string>, keepPlaylists: Set<string>) {
  const staleChannels: string[] = [];
  await cursorEach<ChannelRecord>(STORE.channels, "byRoot", "next", (row) => {
    if (!keepChannels.has(row.id)) staleChannels.push(row.id);
  }, IDBKeyRange.only(rootId));
  await channelsStore.removeMany(staleChannels);

  const stalePlaylists: string[] = [];
  await cursorEach<PlaylistRecord>(STORE.playlists, "byRoot", "next", (row) => {
    if (!keepPlaylists.has(row.id)) stalePlaylists.push(row.id);
  }, IDBKeyRange.only(rootId));
  await playlistsStore.removeMany(stalePlaylists);
}

interface ClassifyContext {
  counters: Counters;
  issues: ScanIssue[];
  existing: Map<string, { modifiedAt: number; size: number; probed: boolean }>;
  fingerprints: Map<string, string>;
  seen: Set<string>;
  onItem: (item: MediaItem) => Promise<void>;
}

/** Turns one directory listing into media items with their sidecars attached. */
async function classifyDirectory(
  job: StartMessage,
  _dir: FileSystemDirectoryHandle,
  relative: string[],
  files: DirEntryFile[],
  ctx: ClassifyContext,
): Promise<{ count: number; firstId?: string }> {
  const mediaFiles: { name: string; file: File; kind: "video" | "audio"; container: string; confidence: string }[] = [];
  const subtitleFiles: { name: string; file: File }[] = [];
  const imageFiles: string[] = [];

  for (const entry of files) {
    if (cancelled) break;
    ctx.counters.filesSeen++;
    let file: File;
    try {
      file = await entry.handle.getFile();
    } catch (error) {
      ctx.issues.push({
        path: [...relative, entry.name].join("/"),
        message: error instanceof Error ? error.message : String(error),
        level: "WARNING",
        at: Date.now(),
      });
      continue;
    }

    const quickKind = detect(entry.name, file.type);
    if (quickKind.kind === "subtitle") {
      subtitleFiles.push({ name: entry.name, file });
      ctx.counters.subtitlesFound++;
      continue;
    }
    if (quickKind.kind === "image") {
      imageFiles.push(entry.name);
      continue;
    }

    let result = quickKind;
    if (job.deepDetect || result.kind === "other") {
      try {
        const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
        result = detect(entry.name, file.type, header);
      } catch (error) {
        ctx.issues.push({
          path: [...relative, entry.name].join("/"),
          message: `header unreadable: ${error instanceof Error ? error.message : String(error)}`,
          level: "WARNING",
          at: Date.now(),
        });
      }
    }
    if (result.kind !== "video" && result.kind !== "audio") continue;
    mediaFiles.push({
      name: entry.name,
      file,
      kind: result.kind,
      container: result.container,
      confidence: result.confidence,
    });
  }

  const mediaBases = mediaFiles.map((m) => baseNameOf(m.name));

  // Group quality variants: same base name minus the resolution marker.
  const variantGroups = new Map<string, typeof mediaFiles>();
  for (const media of mediaFiles) {
    const base = baseNameOf(media.name);
    const quality = detectQualityLabel(base);
    const key = quality ? base.replace(new RegExp(`[\\s._-]*${quality}`, "i"), "").trim().toLowerCase() : base.toLowerCase();
    const group = variantGroups.get(key) ?? [];
    group.push(media);
    variantGroups.set(key, group);
  }

  let count = 0;
  let firstId: string | undefined;

  for (const [, group] of variantGroups) {
    if (cancelled) break;
    const withQuality = group
      .map((m) => ({ media: m, quality: detectQualityLabel(baseNameOf(m.name)) }))
      .sort((a, b) => heightOf(b.quality) - heightOf(a.quality));
    const primary = withQuality[0].media;
    const isVariantSet = group.length > 1 && withQuality.every((w) => w.quality);

    const path = [...relative, primary.name];
    const id = publicId(`item:${job.rootId}`, path);
    ctx.seen.add(id);
    ctx.fingerprints.set(`${primary.file.size}:${primary.file.lastModified}`, id);

    const previous = ctx.existing.get(id);
    const unchanged =
      job.mode === "incremental" &&
      previous &&
      previous.size === primary.file.size &&
      previous.modifiedAt === primary.file.lastModified;

    ctx.counters.mediaFound++;
    count++;
    if (!firstId) firstId = id;
    if (unchanged) continue;
    if (previous) ctx.counters.updated++;
    else ctx.counters.added++;

    const base = baseNameOf(primary.name);
    const subtitles: SubtitleRecord[] = [];
    for (const sub of subtitleFiles) {
      const parsed = parseSidecarName(baseNameOf(sub.name), mediaBases);
      if (parsed.base.toLowerCase() !== base.toLowerCase()) continue;
      const ext = extensionOf(sub.name);
      const label = parsed.language
        ? languageLabel(parsed.language) + (parsed.modifiers.includes("forced") ? " (forced)" : parsed.modifiers.includes("sdh") ? " (SDH)" : "")
        : parsed.extra.join(" ") || sub.name;
      subtitles.push({
        id: publicId(`sub:${job.rootId}`, [...relative, sub.name]),
        language: parsed.language,
        label,
        format: subtitleFormat(ext),
        fileName: sub.name,
        size: sub.file.size,
        forced: parsed.modifiers.includes("forced"),
        sdh: parsed.modifiers.includes("sdh") || parsed.modifiers.includes("cc"),
      });
    }
    subtitles.sort((a, b) => a.label.localeCompare(b.label));

    const qualities: QualityVariant[] = isVariantSet
      ? withQuality.map((w) => ({
          id: publicId(`q:${job.rootId}`, [...relative, w.media.name]),
          label: w.quality ?? "source",
          fileName: w.media.name,
          size: w.media.file.size,
          height: heightOf(w.quality) || undefined,
        }))
      : [];

    const channelName = relative[0] ?? job.rootName;
    const ext = extensionOf(primary.name);
    const title = prettifyTitle(base);
    const playlistPath = relative.slice(1);
    const item: MediaItem = {
      id,
      rootId: job.rootId,
      rootName: job.rootName,
      kind: primary.kind,
      title,
      fileName: primary.name,
      dirPath: relative,
      channel: channelName,
      channelId: publicId(`channel:${job.rootId}`, [channelName]),
      playlist: playlistPath.length ? playlistPath[playlistPath.length - 1] : null,
      playlistId: playlistPath.length ? publicId(`playlist:${job.rootId}`, relative) : null,
      extension: ext,
      container: primary.container,
      mimeType: primary.file.type || guessMime(primary.kind, ext),
      detectionConfidence: primary.confidence,
      size: primary.file.size,
      fileModifiedAt: primary.file.lastModified,
      indexedAt: Date.now(),
      available: true,
      directPlay: canBrowserProbablyPlay(primary.kind, ext, primary.file.type),
      hasThumbnail: false,
      probed: false,
      subtitles,
      qualities,
      tags: buildTags(relative, ext, primary.kind),
      search: [title, primary.name, channelName, ...playlistPath, ext, job.rootName]
        .join(" ")
        .toLowerCase(),
    };
    await ctx.onItem(item);
  }

  return { count, firstId };
}

function heightOf(quality: string | null): number {
  if (!quality) return 0;
  const m = quality.match(/^(\d+)p$/);
  return m ? parseInt(m[1], 10) : 0;
}

function buildTags(relative: string[], ext: string, kind: string): string[] {
  return [...relative.map((r) => r.toLowerCase()), ext, kind].filter(Boolean).slice(0, 12);
}

/** `Lesson.01_intro-final` → `Lesson 01 intro final` */
function prettifyTitle(base: string): string {
  return base
    .replace(/[._]+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return h;
}
