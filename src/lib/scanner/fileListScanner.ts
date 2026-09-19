/**
 * Fallback scanner for browsers without the File System Access API
 * (Firefox, Safari, older Chromium).
 *
 * The user picks a folder with a `<input type="file" webkitdirectory>`; the
 * browser hands us every file inside it with a relative path. We index exactly
 * like the worker scanner does and keep the `File` objects in IndexedDB so
 * playback, thumbnails and subtitles keep working after a reload.
 *
 * Runs in small chunks with yields so the UI never freezes.
 */

import { detect, baseNameOf, extensionOf, canBrowserProbablyPlay, guessMime } from "../core/formats";
import { parseSidecarName, languageLabel } from "../core/languages";
import { publicId } from "../core/ids";
import { subtitleFormat } from "../core/subtitles";
import { blobsStore, channelsStore, itemsStore, playlistsStore, type BlobRow } from "../core/indexdb";
import type { ChannelRecord, MediaItem, PlaylistRecord, RootRecord, SubtitleRecord } from "../core/types";

export interface FileScanResult {
  mediaFound: number;
  subtitlesFound: number;
  filesSeen: number;
  directoriesSeen: number;
}

const CHUNK = 120;

function relativeOf(file: File): string[] {
  const raw = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  const parts = raw.split("/").filter(Boolean);
  // the first segment is the picked folder itself
  return parts.length > 1 ? parts.slice(1, -1) : [];
}

function prettifyTitle(base: string): string {
  return base.replace(/[._]+/g, " ").replace(/\s*-\s*/g, " - ").replace(/\s{2,}/g, " ").trim();
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function scanFileList(
  root: RootRecord,
  files: File[],
  onProgress?: (seen: number, total: number) => void,
): Promise<FileScanResult> {
  const buckets = new Map<string, { media: File[]; subs: File[] }>();

  for (const file of files) {
    if (file.name.startsWith(".")) continue;
    const segments = relativeOf(file);
    const key = segments.join("/");
    const bucket = buckets.get(key) ?? { media: [], subs: [] };
    const kind = detect(file.name, file.type);
    if (kind.kind === "subtitle") bucket.subs.push(file);
    else if (kind.kind === "video" || kind.kind === "audio") bucket.media.push(file);
    else continue;
    buckets.set(key, bucket);
  }

  const result: FileScanResult = {
    mediaFound: 0,
    subtitlesFound: 0,
    filesSeen: files.length,
    directoriesSeen: buckets.size,
  };

  const channels = new Map<string, ChannelRecord>();
  const playlists = new Map<string, PlaylistRecord>();
  let itemBatch: MediaItem[] = [];
  let blobBatch: BlobRow[] = [];

  const flush = async () => {
    if (itemBatch.length) await itemsStore.putMany(itemBatch);
    if (blobBatch.length) await blobsStore.putMany(blobBatch);
    itemBatch = [];
    blobBatch = [];
    await yieldToUi();
  };

  let seen = 0;
  for (const [key, bucket] of buckets) {
    const segments = key ? key.split("/") : [];
    const mediaBases = bucket.media.map((m) => baseNameOf(m.name));
    result.subtitlesFound += bucket.subs.length;

    for (const sub of bucket.subs) {
      blobBatch.push({ path: blobsStore.key(root.id, segments, sub.name), rootId: root.id, file: sub });
    }

    for (const file of bucket.media) {
      const info = detect(file.name, file.type);
      const kind = info.kind === "audio" ? "audio" : "video";
      const path = [...segments, file.name];
      const id = publicId(`item:${root.id}`, path);
      const base = baseNameOf(file.name);
      const ext = extensionOf(file.name);
      const title = prettifyTitle(base);
      const channelName = segments[0] ?? root.name;
      const playlistPath = segments.slice(1);

      const subtitles: SubtitleRecord[] = [];
      for (const sub of bucket.subs) {
        const parsed = parseSidecarName(baseNameOf(sub.name), mediaBases);
        if (parsed.base.toLowerCase() !== base.toLowerCase()) continue;
        subtitles.push({
          id: publicId(`sub:${root.id}`, [...segments, sub.name]),
          language: parsed.language,
          label: parsed.language ? languageLabel(parsed.language) : parsed.extra.join(" ") || sub.name,
          format: subtitleFormat(extensionOf(sub.name)),
          fileName: sub.name,
          size: sub.size,
          forced: parsed.modifiers.includes("forced"),
          sdh: parsed.modifiers.includes("sdh") || parsed.modifiers.includes("cc"),
        });
      }

      itemBatch.push({
        id,
        rootId: root.id,
        rootName: root.name,
        kind,
        title,
        fileName: file.name,
        dirPath: segments,
        channel: channelName,
        channelId: publicId(`channel:${root.id}`, [channelName]),
        playlist: playlistPath.length ? playlistPath[playlistPath.length - 1] : null,
        playlistId: playlistPath.length ? publicId(`playlist:${root.id}`, segments) : null,
        extension: ext,
        container: info.container,
        mimeType: file.type || guessMime(kind, ext),
        detectionConfidence: info.confidence,
        size: file.size,
        fileModifiedAt: file.lastModified,
        indexedAt: Date.now(),
        available: true,
        directPlay: canBrowserProbablyPlay(kind, ext, file.type),
        hasThumbnail: false,
        probed: false,
        subtitles,
        qualities: [],
        tags: [...segments.map((s) => s.toLowerCase()), ext, kind].filter(Boolean).slice(0, 12),
        search: [title, file.name, channelName, ...playlistPath, ext, root.name].join(" ").toLowerCase(),
      });
      blobBatch.push({ path: blobsStore.key(root.id, segments, file.name), rootId: root.id, file });
      result.mediaFound += 1;

      if (segments.length >= 1) {
        const channelId = publicId(`channel:${root.id}`, [segments[0]]);
        const channel =
          channels.get(channelId) ??
          ({
            id: channelId,
            name: segments[0],
            rootId: root.id,
            rootName: root.name,
            itemCount: 0,
            playlistCount: 0,
            lastModifiedAt: 0,
            colorSeed: 0,
            posterItemId: id,
          } satisfies ChannelRecord);
        channel.itemCount += 1;
        channel.lastModifiedAt = Math.max(channel.lastModifiedAt, file.lastModified);
        channels.set(channelId, channel);

        if (segments.length >= 2) {
          const playlistId = publicId(`playlist:${root.id}`, segments);
          const playlist =
            playlists.get(playlistId) ??
            ({
              id: playlistId,
              name: segments[segments.length - 1],
              channelId,
              channel: segments[0],
              rootId: root.id,
              path: segments,
              itemCount: 0,
              lastModifiedAt: 0,
            } satisfies PlaylistRecord);
          playlist.itemCount += 1;
          playlist.lastModifiedAt = Math.max(playlist.lastModifiedAt, file.lastModified);
          playlists.set(playlistId, playlist);
        }
      }

      seen += 1;
      onProgress?.(seen, files.length);
      if (itemBatch.length >= CHUNK) await flush();
    }
  }

  await flush();
  for (const channel of channels.values()) {
    channel.playlistCount = [...playlists.values()].filter((p) => p.channelId === channel.id).length;
  }
  await channelsStore.putMany([...channels.values()]);
  await playlistsStore.putMany([...playlists.values()]);
  return result;
}
