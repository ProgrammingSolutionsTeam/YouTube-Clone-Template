/**
 * Legacy / exotic container fallback.
 *
 * Everything the browser can decode natively (mp4, webm, mov, mp3, aac…) plays
 * through a plain object URL — zero overhead. Anything the browser refuses
 * (rm, rmvb, wmv, asf, avi with old codecs, vob, mpg, flv, ape, wma, dts…) is
 * handled here, fully on the device, with an FFmpeg WebAssembly build that is
 * only downloaded the first time it is actually needed:
 *
 *   1. remux  — container swap with `-c copy` when the streams are already
 *               browser friendly (instant, no quality loss)
 *   2. stream — segment-by-segment transcode fed into a MediaSource so a long
 *               file starts playing after the first few seconds
 *   3. bake   — whole-file convert (used for audio and when MediaSource is
 *               unavailable)
 *
 * Nothing is uploaded anywhere and the source file is never modified.
 */

import { log } from "../core/logger";

const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

const SEGMENT_SECONDS = 8;
/** how far ahead of the playhead we keep transcoding */
const BUFFER_AHEAD = 24;
const MP4_MIME = 'video/mp4; codecs="avc1.4D401F,mp4a.40.2"';

export type TranscodeStage = "loading" | "remuxing" | "converting" | "streaming" | "ready" | "error";

export interface TranscodeStatus {
  stage: TranscodeStage;
  /** 0..1 when known */
  progress?: number;
  message?: string;
}

export interface TranscodeSession {
  /** object URL (blob: or MediaSource) to feed the media element */
  url: string;
  mode: "remux" | "stream" | "bake";
  destroy: () => void;
}

type FFmpegInstance = import("@ffmpeg/ffmpeg").FFmpeg;

let instance: Promise<FFmpegInstance> | null = null;

export function transcodingSupported(): boolean {
  return typeof WebAssembly === "object" && typeof URL.createObjectURL === "function";
}

export function mediaSourceSupported(): boolean {
  return typeof window !== "undefined" && typeof window.MediaSource !== "undefined" && MediaSource.isTypeSupported(MP4_MIME);
}

async function engine(): Promise<FFmpegInstance> {
  if (!instance) {
    instance = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ff = new FFmpeg();
      ff.on("log", ({ message }) => log.debug("ffmpeg", message));
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((error) => {
      instance = null;
      throw error;
    });
  }
  return instance;
}

/** Frees the WASM instance and its memory (called when the player unmounts). */
export async function releaseEngine(): Promise<void> {
  const current = instance;
  instance = null;
  try {
    (await current)?.terminate();
  } catch {
    /* nothing to do */
  }
}

async function writeInput(file: File, name: string): Promise<FFmpegInstance> {
  const ff = await engine();
  const { fetchFile } = await import("@ffmpeg/util");
  await ff.writeFile(name, await fetchFile(file));
  return ff;
}

function inputName(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "bin" : file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `input.${ext || "bin"}`;
}

const VIDEO_ARGS = [
  "-c:v", "libx264",
  "-preset", "ultrafast",
  "-tune", "zerolatency",
  "-crf", "27",
  "-pix_fmt", "yuv420p",
  "-vf", "scale='min(1280,iw)':-2:flags=fast_bilinear",
  "-c:a", "aac",
  "-b:a", "128k",
  "-ac", "2",
  "-ar", "44100",
];

const FRAG_ARGS = ["-movflags", "+frag_keyframe+empty_moov+default_base_is_moof", "-f", "mp4"];

/**
 * Tries a lossless container swap first: many .mkv/.avi/.ts/.flv files already
 * carry H.264 + AAC and only the wrapper confuses the browser.
 */
async function tryRemux(file: File, onStatus: (s: TranscodeStatus) => void): Promise<TranscodeSession | null> {
  if (file.size > 2_400_000_000) return null;
  onStatus({ stage: "remuxing" });
  const name = inputName(file);
  try {
    const ff = await writeInput(file, name);
    const code = await ff.exec(["-i", name, "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy", ...FRAG_ARGS, "remux.mp4"]);
    if (code !== 0) throw new Error(`remux_failed_${code}`);
    const data = (await ff.readFile("remux.mp4")) as Uint8Array;
    await ff.deleteFile("remux.mp4").catch(() => undefined);
    if (!data || data.byteLength < 1024) throw new Error("remux_empty");
    const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    onStatus({ stage: "ready" });
    return {
      url,
      mode: "remux",
      destroy: () => {
        URL.revokeObjectURL(url);
        void ff.deleteFile(name).catch(() => undefined);
      },
    };
  } catch (error) {
    log.info("transcoder", "remux not possible, falling back", { error: String(error) });
    return null;
  }
}

/** Whole-file convert — used for audio and when MediaSource is unavailable. */
async function bake(
  file: File,
  kind: "video" | "audio",
  onStatus: (s: TranscodeStatus) => void,
): Promise<TranscodeSession> {
  const name = inputName(file);
  const out = kind === "audio" ? "baked.m4a" : "baked.mp4";
  const ff = await writeInput(file, name);
  const progress = ({ progress: p }: { progress: number }) =>
    onStatus({ stage: "converting", progress: Math.min(0.99, Math.max(0, p)) });
  ff.on("progress", progress);
  try {
    const args =
      kind === "audio"
        ? ["-i", name, "-vn", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
        : ["-i", name, ...VIDEO_ARGS, "-movflags", "+faststart", out];
    const code = await ff.exec(args);
    if (code !== 0) throw new Error(`convert_failed_${code}`);
    const data = (await ff.readFile(out)) as Uint8Array;
    const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: kind === "audio" ? "audio/mp4" : "video/mp4" });
    const url = URL.createObjectURL(blob);
    onStatus({ stage: "ready" });
    return {
      url,
      mode: "bake",
      destroy: () => {
        URL.revokeObjectURL(url);
        void ff.deleteFile(out).catch(() => undefined);
        void ff.deleteFile(name).catch(() => undefined);
      },
    };
  } finally {
    ff.off("progress", progress);
  }
}

/**
 * Progressive playback: transcodes `SEGMENT_SECONDS` chunks on demand and
 * appends them to a MediaSource, so playback starts in seconds and seeking
 * anywhere in a multi-hour file only converts what is needed.
 */
async function streamSegments(
  file: File,
  duration: number,
  onStatus: (s: TranscodeStatus) => void,
  getPlayhead: () => number,
  startAt: number,
): Promise<TranscodeSession> {
  const name = inputName(file);
  const ff = await writeInput(file, name);
  const source = new MediaSource();
  const url = URL.createObjectURL(source);
  let disposed = false;
  let requestedSeek: number | null = null;

  const opened = new Promise<SourceBuffer>((resolve, reject) => {
    source.addEventListener("sourceopen", () => {
      try {
        source.duration = duration;
        const buffer = source.addSourceBuffer(MP4_MIME);
        buffer.mode = "segments";
        resolve(buffer);
      } catch (error) {
        reject(error);
      }
    });
    source.addEventListener("error", () => reject(new Error("mediasource_error")));
  });

  const buffer = await opened;

  const idle = () =>
    new Promise<void>((resolve) => {
      if (!buffer.updating) return resolve();
      buffer.addEventListener("updateend", () => resolve(), { once: true });
    });

  const bufferedEnd = (time: number) => {
    for (let i = 0; i < buffer.buffered.length; i++) {
      if (time >= buffer.buffered.start(i) - 0.5 && time <= buffer.buffered.end(i)) return buffer.buffered.end(i);
    }
    return null;
  };

  const pump = async () => {
    let cursor = Math.max(0, Math.floor(startAt / SEGMENT_SECONDS) * SEGMENT_SECONDS);
    let first = true;
    while (!disposed && cursor < duration) {
      if (requestedSeek !== null) {
        const target = requestedSeek;
        requestedSeek = null;
        cursor = Math.max(0, Math.floor(target / SEGMENT_SECONDS) * SEGMENT_SECONDS);
        await idle();
        try {
          buffer.timestampOffset = cursor;
        } catch {
          /* set again below */
        }
      }

      const ahead = bufferedEnd(getPlayhead());
      if (!first && ahead !== null && ahead - getPlayhead() > BUFFER_AHEAD) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      const length = Math.min(SEGMENT_SECONDS, duration - cursor);
      onStatus({ stage: first ? "converting" : "streaming", progress: cursor / duration });
      try {
        const code = await ff.exec([
          "-ss", String(cursor),
          "-i", name,
          "-t", String(length + 0.2),
          "-map", "0:v:0?",
          "-map", "0:a:0?",
          ...VIDEO_ARGS,
          ...FRAG_ARGS,
          "seg.mp4",
        ]);
        if (disposed) return;
        if (code !== 0) throw new Error(`segment_failed_${code}`);
        const data = (await ff.readFile("seg.mp4")) as Uint8Array;
        await ff.deleteFile("seg.mp4").catch(() => undefined);
        if (!data || data.byteLength < 512) throw new Error("segment_empty");
        await idle();
        if (disposed) return;
        buffer.timestampOffset = cursor;
        buffer.appendBuffer(data.slice().buffer as ArrayBuffer);
        await idle();
        if (first) {
          first = false;
          onStatus({ stage: "ready" });
        }
      } catch (error) {
        if (disposed) return;
        log.warn("transcoder", "segment failed", { cursor, error: String(error) });
        onStatus({ stage: "error", message: String(error) });
        return;
      }
      cursor += SEGMENT_SECONDS;
    }
    if (!disposed && source.readyState === "open") {
      try {
        source.endOfStream();
      } catch {
        /* already closed */
      }
    }
  };

  void pump();

  return {
    url,
    mode: "stream",
    destroy: () => {
      disposed = true;
      URL.revokeObjectURL(url);
      void ff.deleteFile(name).catch(() => undefined);
    },
    // exposed through the session object below
    ...({ seek: (time: number) => (requestedSeek = time) } as object),
  } as TranscodeSession & { seek?: (time: number) => void };
}

export interface FallbackRequest {
  file: File;
  kind: "video" | "audio";
  /** duration in seconds when already known from the index */
  duration?: number;
  /** resume position, so streaming starts at the right chunk */
  startAt?: number;
  onStatus: (status: TranscodeStatus) => void;
  getPlayhead?: () => number;
}

/**
 * Makes any container playable. Picks the cheapest strategy that can work.
 */
export async function openFallback(request: FallbackRequest): Promise<TranscodeSession & { seek?: (t: number) => void }> {
  const { file, kind, duration, startAt = 0, onStatus, getPlayhead } = request;
  if (!transcodingSupported()) throw new Error("wasm_unsupported");
  onStatus({ stage: "loading" });

  if (kind === "video") {
    const remuxed = await tryRemux(file, onStatus);
    if (remuxed) return remuxed;
    if (duration && duration > 45 && mediaSourceSupported()) {
      return streamSegments(file, duration, onStatus, getPlayhead ?? (() => 0), startAt);
    }
  }
  return bake(file, kind, onStatus);
}
