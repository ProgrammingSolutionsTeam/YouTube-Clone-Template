/**
 * Logging with levels, persisted locally and mirrored to the backend audit log
 * for admin-relevant events. Raw errors stay here; users only see friendly text.
 */

import { logStore } from "./indexdb";
import type { LogEntry } from "./types";

type Level = LogEntry["level"];
type Category = LogEntry["category"];

const LEVEL_WEIGHT: Record<Level, number> = { DEBUG: 10, INFO: 20, WARNING: 30, ERROR: 40 };

let minLevel: Level = import.meta.env.DEV ? "DEBUG" : "INFO";

export function setLogLevel(level: Level) {
  minLevel = level;
}

async function write(level: Level, category: Category, message: string, details?: unknown) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
  const entry: LogEntry = { at: Date.now(), level, category, message, details: safeDetails(details) };
  if (import.meta.env.DEV) {
    const fn = level === "ERROR" ? console.error : level === "WARNING" ? console.warn : console.info;
    fn(`[${category}] ${message}`, details ?? "");
  }
  try {
    await logStore.append(entry);
  } catch {
    /* logging must never break the app */
  }
}

function safeDetails(details: unknown): unknown {
  if (details instanceof Error) return { name: details.name, message: details.message };
  if (details === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return String(details);
  }
}

export const log = {
  debug: (category: Category, message: string, details?: unknown) => write("DEBUG", category, message, details),
  info: (category: Category, message: string, details?: unknown) => write("INFO", category, message, details),
  warn: (category: Category, message: string, details?: unknown) => write("WARNING", category, message, details),
  error: (category: Category, message: string, details?: unknown) => write("ERROR", category, message, details),
  recent: logStore.recent,
  clear: logStore.clear,
};

/** Maps an internal failure to a message that is safe to show to a user. */
export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/NotAllowedError|permission/i.test(raw)) return "errors.permission";
  if (/NotFoundError|ENOENT|could not be found/i.test(raw)) return "errors.missingFile";
  if (/NotReadableError|read/i.test(raw)) return "errors.unreadable";
  if (/unsupported_subtitle_format/i.test(raw)) return "errors.subtitleFormat";
  if (/AbortError/i.test(raw)) return "errors.cancelled";
  return "errors.generic";
}
