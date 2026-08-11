/**
 * Subtitle conversion layer.
 * The browser's <track> element only understands WebVTT, so SRT / ASS / SSA /
 * SUB / SBV / LRC are converted to VTT in the client before being attached.
 * The original file is never modified and stays downloadable in its own format.
 */

export type SubtitleFormat = "vtt" | "srt" | "ass" | "ssa" | "sub" | "sbv" | "lrc" | "unknown";

export function subtitleFormat(ext: string): SubtitleFormat {
  const e = ext.toLowerCase();
  if (e === "vtt" || e === "webvtt") return "vtt";
  if (e === "srt") return "srt";
  if (e === "ass") return "ass";
  if (e === "ssa") return "ssa";
  if (e === "sub") return "sub";
  if (e === "sbv") return "sbv";
  if (e === "lrc") return "lrc";
  return "unknown";
}

function pad(n: number, width = 2): string {
  return String(Math.floor(n)).padStart(width, "0");
}

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms, 3)}`;
}

function parseTime(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.](\d{1,3}))?$/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const frac = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) / 1000 : 0;
  return h * 3600 + min * 60 + sec + frac;
}

interface Cue {
  start: number;
  end: number;
  text: string;
}

function cuesToVtt(cues: Cue[], delay = 0): string {
  const body = cues
    .filter((c) => c.end > c.start || c.end === c.start)
    .map((c, i) => {
      const start = Math.max(0, c.start + delay);
      const end = Math.max(start + 0.05, c.end + delay);
      return `${i + 1}\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\n${c.text}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseSrt(text: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = stripBom(text).replace(/\r\n?/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    const timeLineIndex = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIndex === -1) continue;
    const [rawStart, rawEnd] = lines[timeLineIndex].split("-->");
    const start = parseTime(rawStart ?? "");
    const end = parseTime((rawEnd ?? "").split(/\s+/)[0] ?? "");
    if (start === null || end === null) continue;
    const body = lines
      .slice(timeLineIndex + 1)
      .join("\n")
      .replace(/\{\\[^}]*\}/g, "");
    if (body.trim()) cues.push({ start, end, text: body });
  }
  return cues;
}

function parseSbv(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of stripBom(text).replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length < 2) continue;
    const [a, b] = lines[0].split(",");
    const start = parseTime(a ?? "");
    const end = parseTime(b ?? "");
    if (start === null || end === null) continue;
    cues.push({ start, end, text: lines.slice(1).join("\n") });
  }
  return cues;
}

function parseLrc(text: string): Cue[] {
  const stamps: { time: number; text: string }[] = [];
  for (const line of stripBom(text).replace(/\r\n?/g, "\n").split("\n")) {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!matches.length) continue;
    const body = line.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of matches) {
      const time =
        parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (m[3] ? parseInt(m[3].padEnd(3, "0"), 10) / 1000 : 0);
      if (body) stamps.push({ time, text: body });
    }
  }
  stamps.sort((a, b) => a.time - b.time);
  return stamps.map((s, i) => ({ start: s.time, end: stamps[i + 1]?.time ?? s.time + 4, text: s.text }));
}

/** ASS/SSA: reads the [Events] section and honours Dialogue field ordering. */
function parseAss(text: string): Cue[] {
  const lines = stripBom(text).replace(/\r\n?/g, "\n").split("\n");
  const cues: Cue[] = [];
  let fields: string[] = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"];
  let inEvents = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[.*\]$/.test(trimmed)) {
      inEvents = /^\[events\]$/i.test(trimmed);
      continue;
    }
    if (!inEvents) continue;
    if (/^format\s*:/i.test(trimmed)) {
      fields = trimmed.slice(trimmed.indexOf(":") + 1).split(",").map((f) => f.trim());
      continue;
    }
    if (!/^dialogue\s*:/i.test(trimmed)) continue;
    const payload = trimmed.slice(trimmed.indexOf(":") + 1);
    const parts = payload.split(",");
    const textIndex = fields.indexOf("Text");
    const head = parts.slice(0, textIndex);
    const body = parts.slice(textIndex).join(",");
    const start = parseTime(head[fields.indexOf("Start")] ?? "");
    const end = parseTime(head[fields.indexOf("End")] ?? "");
    if (start === null || end === null) continue;
    const clean = body
      .replace(/\{\\[^}]*\}/g, "")
      .replace(/\\N|\\n/g, "\n")
      .replace(/\\h/g, " ")
      .trim();
    if (clean) cues.push({ start, end, text: clean });
  }
  return cues;
}

/** MicroDVD .sub — frame based, needs the video frame rate. */
function parseMicroDvd(text: string, fps = 25): Cue[] {
  const cues: Cue[] = [];
  for (const line of stripBom(text).replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(/^\{(\d+)\}\{(\d+)\}(.*)$/);
    if (!m) continue;
    const body = m[3].replace(/\|/g, "\n").replace(/\{[^}]*\}/g, "").trim();
    if (body) cues.push({ start: parseInt(m[1], 10) / fps, end: parseInt(m[2], 10) / fps, text: body });
  }
  return cues;
}

function shiftVtt(text: string, delay: number): string {
  if (!delay) return stripBom(text);
  return stripBom(text).replace(
    /(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}/g,
    (match) => {
      const t = parseTime(match);
      return t === null ? match : formatTimestamp(Math.max(0, t + delay));
    },
  );
}

/** Converts any supported subtitle text into WebVTT, applying a delay in seconds. */
export function toVtt(text: string, format: SubtitleFormat, options: { delay?: number; fps?: number } = {}): string {
  const delay = options.delay ?? 0;
  switch (format) {
    case "vtt":
      return shiftVtt(text, delay);
    case "srt":
      return cuesToVtt(parseSrt(text), delay);
    case "ass":
    case "ssa":
      return cuesToVtt(parseAss(text), delay);
    case "sbv":
      return cuesToVtt(parseSbv(text), delay);
    case "lrc":
      return cuesToVtt(parseLrc(text), delay);
    case "sub":
      return cuesToVtt(parseMicroDvd(text, options.fps ?? 25), delay);
    default: {
      // Last resort: try SRT rules, they cover most loosely formatted files.
      const cues = parseSrt(text);
      if (cues.length) return cuesToVtt(cues, delay);
      throw new Error("unsupported_subtitle_format");
    }
  }
}

/** Decodes subtitle bytes, falling back from UTF-8 to windows-1256/1252. */
export function decodeSubtitle(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const strict = new TextDecoder("utf-8", { fatal: true });
  try {
    return strict.decode(bytes);
  } catch {
    for (const enc of ["windows-1256", "windows-1252", "iso-8859-1"]) {
      try {
        return new TextDecoder(enc).decode(bytes);
      } catch {
        /* try the next encoding */
      }
    }
    return new TextDecoder("utf-8").decode(bytes);
  }
}
