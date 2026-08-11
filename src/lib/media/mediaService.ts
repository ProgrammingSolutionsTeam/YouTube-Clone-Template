/**
 * Media service.
 *
 * The single gate between an opaque public id and a real file on disk.
 * Callers only ever pass ids; the real path is resolved internally from the
 * granted root handle, so a hostile caller cannot request an arbitrary file.
 *
 * Playback uses blob object URLs backed by the on-disk File. The browser reads
 * ranges lazily from disk (the local equivalent of HTTP 206 range streaming), so
 * a 40 GB file starts instantly and seeking never downloads the whole file.
 */

import { aliasStore, itemsStore, rootsStore, thumbsStore } from "../core/indexdb";
import { ensurePermission, resolveFile } from "../core/filesystem";
import { canBrowserProbablyPlay, guessMime } from "../core/formats";
import { decodeSubtitle, subtitleFormat, toVtt } from "../core/subtitles";
import { log } from "../core/logger";
import type { MediaItem, SubtitleRecord } from "../core/types";

export class MediaAccessError extends Error {
  constructor(public code: "not_found" | "permission" | "unreadable" | "unavailable", public detail?: unknown) {
    super(code);
    this.name = "MediaAccessError";
  }
}

/** Resolves an id, following rename aliases so old links keep working. */
export async function getItem(id: string): Promise<MediaItem | null> {
  const direct = await itemsStore.get(id);
  if (direct) return direct;
  const resolved = await aliasStore.resolve(id);
  if (resolved !== id) {
    const aliased = await itemsStore.get(resolved);
    if (aliased) return aliased;
  }
  return null;
}

async function fileFor(item: MediaItem, fileName?: string): Promise<File> {
  const root = await rootsStore.get(item.rootId);
  if (!root) throw new MediaAccessError("unavailable");
  if (!(await ensurePermission(root.handle))) throw new MediaAccessError("permission");
  try {
    return await resolveFile(root.handle, item.dirPath, fileName ?? item.fileName);
  } catch (error) {
    log.warn("media", "file resolve failed", { id: item.id, error: String(error) });
    throw new MediaAccessError("not_found", error);
  }
}

export interface PlaybackSource {
  url: string;
  mimeType: string;
  fileName: string;
  size: number;
  directPlay: boolean;
  /** call when the player unmounts */
  release: () => void;
}

/**
 * Opens a playback source for an item, optionally for a specific quality
 * variant. `directPlay` reports whether the browser can decode this container.
 */
export async function openPlayback(item: MediaItem, qualityId?: string): Promise<PlaybackSource> {
  const variant = qualityId ? item.qualities.find((q) => q.id === qualityId) : undefined;
  const file = await fileFor(item, variant?.fileName);
  const mimeType = file.type || guessMime(item.kind, item.extension);
  const url = URL.createObjectURL(file);
  return {
    url,
    mimeType,
    fileName: file.name,
    size: file.size,
    directPlay: canBrowserProbablyPlay(item.kind, item.extension, file.type),
    release: () => URL.revokeObjectURL(url),
  };
}

/** Reads a subtitle by its own opaque id and returns a WebVTT object URL. */
export async function openSubtitle(
  item: MediaItem,
  subtitleId: string,
  options: { delay?: number; fps?: number } = {},
): Promise<{ url: string; release: () => void }> {
  const record = item.subtitles.find((s) => s.id === subtitleId);
  if (!record) throw new MediaAccessError("not_found");
  const file = await fileFor(item, record.fileName);
  const text = decodeSubtitle(await file.arrayBuffer());
  const vtt = toVtt(text, subtitleFormat(record.format), { delay: options.delay ?? 0, fps: options.fps ?? item.frameRate ?? 25 });
  const url = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
  return { url, release: () => URL.revokeObjectURL(url) };
}

/** Downloads the original subtitle file untouched, without exposing its path. */
export async function downloadSubtitle(item: MediaItem, subtitleId: string): Promise<void> {
  const record = item.subtitles.find((s) => s.id === subtitleId);
  if (!record) throw new MediaAccessError("not_found");
  const file = await fileFor(item, record.fileName);
  triggerDownload(file, record.fileName);
}

export async function downloadMedia(item: MediaItem, qualityId?: string): Promise<void> {
  const variant = qualityId ? item.qualities.find((q) => q.id === qualityId) : undefined;
  const file = await fileFor(item, variant?.fileName);
  triggerDownload(file, file.name);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/* ------------------------------------------------------- metadata + posters */

export interface ProbeResult {
  duration?: number;
  width?: number;
  height?: number;
  audioTrackCount?: number;
  bitrate?: number;
  thumbnail?: Blob;
  error?: string;
}

/**
 * Extracts real metadata from the file using the browser's media decoder
 * (the client-side equivalent of ffprobe) and grabs a poster frame with canvas.
 * The original file is never written to; the poster lives in the local cache.
 */
export async function probeItem(item: MediaItem, options: { thumbnail?: boolean } = {}): Promise<ProbeResult> {
  let file: File;
  try {
    file = await fileFor(item);
  } catch (error) {
    return { error: error instanceof MediaAccessError ? error.code : String(error) };
  }

  const url = URL.createObjectURL(file);
  const element = document.createElement(item.kind === "audio" ? "audio" : "video");
  element.preload = "metadata";
  element.muted = true;
  (element as HTMLVideoElement).crossOrigin = "anonymous";

  const cleanup = () => {
    element.removeAttribute("src");
    element.load();
    URL.revokeObjectURL(url);
  };

  try {
    const metadata = await new Promise<ProbeResult>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("probe_timeout")), 20_000);
      element.onloadedmetadata = () => {
        window.clearTimeout(timer);
        const video = element as HTMLVideoElement;
        const tracks = (element as unknown as { audioTracks?: { length: number } }).audioTracks;
        resolve({
          duration: Number.isFinite(element.duration) ? element.duration : undefined,
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
          audioTrackCount: tracks?.length,
          bitrate: element.duration ? Math.round((file.size * 8) / element.duration) : undefined,
        });
      };
      element.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("decode_unsupported"));
      };
      element.src = url;
    });

    if (options.thumbnail !== false && item.kind === "video" && metadata.duration) {
      metadata.thumbnail = await captureFrame(element as HTMLVideoElement, metadata.duration);
    }
    return metadata;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  } finally {
    cleanup();
  }
}

/** Seeks a little past the start to avoid black intro frames. */
async function captureFrame(video: HTMLVideoElement, duration: number): Promise<Blob | undefined> {
  const target = Math.min(Math.max(duration * 0.12, 1.5), Math.max(duration - 0.3, 0.1));
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("seek_timeout")), 15_000);
      video.onseeked = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("seek_failed"));
      };
      video.currentTime = target;
    });
    const width = 480;
    const scale = video.videoWidth ? width / video.videoWidth : 1;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((video.videoHeight || 270) * scale));
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | undefined>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.72),
    );
  } catch {
    return undefined;
  }
}

/** Persists probe results into the index and caches the poster. */
export async function saveProbe(item: MediaItem, probe: ProbeResult): Promise<MediaItem> {
  if (probe.thumbnail) await thumbsStore.put(item.id, probe.thumbnail);
  const updated: MediaItem = {
    ...item,
    duration: probe.duration ?? item.duration,
    width: probe.width ?? item.width,
    height: probe.height ?? item.height,
    bitrate: probe.bitrate ?? item.bitrate,
    audioTrackCount: probe.audioTrackCount ?? item.audioTrackCount,
    hasThumbnail: item.hasThumbnail || Boolean(probe.thumbnail),
    probed: true,
    probeError: probe.error,
    directPlay: probe.error === "decode_unsupported" ? false : item.directPlay,
  };
  await itemsStore.put(updated);
  return updated;
}

export async function thumbnailUrl(id: string): Promise<string | null> {
  const row = await thumbsStore.get(id);
  return row ? URL.createObjectURL(row.blob) : null;
}
