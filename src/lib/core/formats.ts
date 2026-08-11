/**
 * Media detection.
 *
 * Detection is layered and never relies on the extension alone:
 *   1. container signature sniffing on the first bytes of the file (magic numbers)
 *   2. the browser-reported MIME type of the File object
 *   3. the extension table below as the last hint
 * A file is only rejected when all three layers fail.
 */

export type MediaKind = "video" | "audio" | "subtitle" | "image" | "other";

export const VIDEO_EXTENSIONS = [
  "mp4", "m4v", "mkv", "webm", "mov", "avi", "mpeg", "mpg", "mpe", "m2v", "ts",
  "m2ts", "mts", "flv", "f4v", "3gp", "3g2", "ogv", "ogm", "wmv", "asf", "vob",
  "divx", "rm", "rmvb", "mxf", "dv", "amv", "svi", "m4p", "qt", "yuv", "hevc",
  "h264", "h265", "av1", "mj2", "mjpeg", "mjpg", "wtv", "dvr-ms", "ivf",
];

export const AUDIO_EXTENSIONS = [
  "mp3", "aac", "m4a", "m4b", "flac", "wav", "wave", "opus", "ogg", "oga",
  "wma", "aiff", "aif", "aifc", "alac", "ape", "wv", "mka", "amr", "au",
  "mid", "midi", "ra", "dsf", "dff", "spx", "caf", "mp2", "ac3", "eac3", "dts",
];

export const SUBTITLE_EXTENSIONS = [
  "srt", "vtt", "webvtt", "ass", "ssa", "sub", "sbv", "smi", "sami", "lrc", "ttml", "dfxp",
];

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "jfif", "tif", "tiff"];

/** Containers the browser can normally decode without any server-side help. */
export const BROWSER_NATIVE_VIDEO = ["mp4", "m4v", "webm", "ogv", "mov", "3gp"];
export const BROWSER_NATIVE_AUDIO = ["mp3", "aac", "m4a", "wav", "wave", "flac", "opus", "ogg", "oga"];

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function baseNameOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? name : name.slice(0, i);
}

export function kindFromExtension(name: string): MediaKind {
  const ext = extensionOf(name);
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (SUBTITLE_EXTENSIONS.includes(ext)) return "subtitle";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return "other";
}

export function kindFromMime(mime: string | undefined): MediaKind {
  if (!mime) return "other";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (mime === "text/vtt" || mime === "application/x-subrip") return "subtitle";
  return "other";
}

/** Container signatures, checked against the first 32 bytes of the file. */
const SIGNATURES: { kind: MediaKind; container: string; test: (b: Uint8Array) => boolean }[] = [
  { kind: "video", container: "mp4", test: (b) => ascii(b, 4, 8) === "ftyp" },
  { kind: "video", container: "matroska", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { kind: "video", container: "riff", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "AVI " },
  { kind: "audio", container: "wav", test: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" },
  { kind: "video", container: "ogg", test: (b) => ascii(b, 0, 4) === "OggS" },
  { kind: "video", container: "asf", test: (b) => b[0] === 0x30 && b[1] === 0x26 && b[2] === 0xb2 && b[3] === 0x75 },
  { kind: "video", container: "flv", test: (b) => ascii(b, 0, 3) === "FLV" },
  { kind: "video", container: "mpeg-ps", test: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && (b[3] === 0xba || b[3] === 0xb3) },
  { kind: "video", container: "mpeg-ts", test: (b) => b[0] === 0x47 },
  { kind: "audio", container: "mp3", test: (b) => ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { kind: "audio", container: "flac", test: (b) => ascii(b, 0, 4) === "fLaC" },
  { kind: "audio", container: "aiff", test: (b) => ascii(b, 0, 4) === "FORM" },
  { kind: "audio", container: "amr", test: (b) => ascii(b, 0, 5) === "#!AMR" },
  { kind: "audio", container: "ac3", test: (b) => b[0] === 0x0b && b[1] === 0x77 },
  { kind: "audio", container: "dts", test: (b) => b[0] === 0x7f && b[1] === 0xfe && b[2] === 0x80 && b[3] === 0x01 },
];

function ascii(b: Uint8Array, from: number, to: number): string {
  let s = "";
  for (let i = from; i < to && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

export interface DetectionResult {
  kind: MediaKind;
  container: string;
  confidence: "signature" | "mime" | "extension" | "none";
}

/** Sniffs a container signature from a byte header. */
export function detectFromHeader(header: Uint8Array): { kind: MediaKind; container: string } | null {
  for (const sig of SIGNATURES) {
    try {
      if (sig.test(header)) return { kind: sig.kind, container: sig.container };
    } catch {
      /* a malformed header must never abort the scan */
    }
  }
  return null;
}

/**
 * Full detection for one file. `header` is optional — when omitted only the
 * MIME/extension layers run (used for very large directories where reading a
 * header per file would be wasteful).
 */
export function detect(name: string, mime: string | undefined, header?: Uint8Array): DetectionResult {
  const ext = extensionOf(name);
  const byExt = kindFromExtension(name);

  if (byExt === "subtitle") return { kind: "subtitle", container: ext, confidence: "extension" };

  if (header && header.length >= 12) {
    const sniffed = detectFromHeader(header);
    if (sniffed) {
      // A signature that says "video" for a known audio extension (e.g. .mka /
      // .oga share containers with video) is corrected by the extension.
      const kind = byExt === "audio" ? "audio" : sniffed.kind;
      return { kind, container: sniffed.container, confidence: "signature" };
    }
  }

  const byMime = kindFromMime(mime);
  if (byMime !== "other") return { kind: byMime, container: ext || byMime, confidence: "mime" };
  if (byExt !== "other") return { kind: byExt, container: ext, confidence: "extension" };
  return { kind: "other", container: ext, confidence: "none" };
}

/** Can this browser most likely play the file without transcoding? */
export function canBrowserProbablyPlay(kind: MediaKind, ext: string, mime?: string): boolean {
  if (typeof document === "undefined") {
    return kind === "video" ? BROWSER_NATIVE_VIDEO.includes(ext) : BROWSER_NATIVE_AUDIO.includes(ext);
  }
  const el = document.createElement(kind === "audio" ? "audio" : "video");
  const candidates = [mime, guessMime(kind, ext)].filter(Boolean) as string[];
  for (const c of candidates) {
    const r = el.canPlayType(c);
    if (r === "probably" || r === "maybe") return true;
  }
  return kind === "video" ? BROWSER_NATIVE_VIDEO.includes(ext) : BROWSER_NATIVE_AUDIO.includes(ext);
}

export function guessMime(kind: MediaKind, ext: string): string {
  const map: Record<string, string> = {
    mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm",
    mkv: "video/x-matroska", avi: "video/x-msvideo", ogv: "video/ogg", "3gp": "video/3gpp",
    ts: "video/mp2t", m2ts: "video/mp2t", flv: "video/x-flv", wmv: "video/x-ms-wmv",
    mpeg: "video/mpeg", mpg: "video/mpeg", vob: "video/mpeg",
    mp3: "audio/mpeg", aac: "audio/aac", m4a: "audio/mp4", flac: "audio/flac",
    wav: "audio/wav", opus: "audio/ogg", ogg: "audio/ogg", oga: "audio/ogg",
    wma: "audio/x-ms-wma", aiff: "audio/aiff", mka: "audio/x-matroska",
  };
  return map[ext] ?? (kind === "audio" ? "audio/*" : "video/*");
}

/** Detects `... 1080p ...` style quality markers used to group variant files. */
export function detectQualityLabel(name: string): string | null {
  const m = name.match(/(?:^|[^0-9a-z])(\d{3,4})p(?:[^0-9a-z]|$)/i);
  if (m) return `${m[1]}p`;
  if (/(^|\W)(4k|uhd|2160)(\W|$)/i.test(name)) return "2160p";
  if (/(^|\W)(2k|1440)(\W|$)/i.test(name)) return "1440p";
  return null;
}

export const QUALITY_ORDER = ["4320p", "2160p", "1440p", "1080p", "900p", "720p", "576p", "480p", "360p", "240p", "144p"];
