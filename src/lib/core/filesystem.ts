/**
 * Filesystem access layer (platform abstraction).
 *
 * The browser cannot freely read `F:\#Videos`; the operating system requires an
 * explicit user grant. We use the File System Access API: the admin picks the
 * folder once, the handle is stored in IndexedDB and the grant survives
 * restarts. Nothing here works around OS permissions.
 *
 * Every lookup goes through `resolveDirectory`, which walks the granted root
 * handle segment by segment. A path segment containing a separator, `..` or an
 * absolute prefix is rejected, so directory traversal is structurally
 * impossible — there is no API that accepts a raw path from the client.
 */

import { log } from "./logger";
import type { RootRecord } from "./types";

export type PlatformFamily = "windows" | "unix" | "unknown";

export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

export function supportsPersistentHandles(): boolean {
  return typeof indexedDB !== "undefined" && supportsDirectoryPicker();
}

export function platformHint(): PlatformFamily {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac|Linux|Android|CrOS|iPhone|iPad/i.test(ua)) return "unix";
  return "unknown";
}

/** Human-readable example paths per platform, used by the admin UI. */
export function pathExamples(): string[] {
  switch (platformHint()) {
    case "windows":
      return ["F:\\#Videos", "C:\\Media", "D:\\Movies"];
    case "unix":
      return ["/home/user/videos", "/Users/name/Movies", "/mnt/media", "/storage/emulated/0/Movies"];
    default:
      return ["/media/videos"];
  }
}

const UNSAFE_SEGMENT = /(^\.\.?$)|[/\\]|^[a-zA-Z]:|\0/;

/** Rejects traversal, absolute prefixes and NUL injection in a path segment. */
export function assertSafeSegment(segment: string): void {
  if (!segment || UNSAFE_SEGMENT.test(segment)) {
    throw new Error(`unsafe_path_segment:${segment}`);
  }
}

export function assertSafePath(segments: string[]): void {
  for (const segment of segments) assertSafeSegment(segment);
}

/** Opens the OS folder picker and returns the granted handle. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!supportsDirectoryPicker()) throw new Error("directory_picker_unsupported");
  const picker = (window as unknown as {
    showDirectoryPicker: (options?: { mode?: "read" | "readwrite"; id?: string }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  return picker({ mode: "read", id: "media-library-root" });
}

type PermissionState = "granted" | "denied" | "prompt";

interface PermissionCapableHandle extends FileSystemDirectoryHandle {
  queryPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
}

export async function handlePermission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  const h = handle as PermissionCapableHandle;
  if (!h.queryPermission) return "granted";
  try {
    return await h.queryPermission({ mode: "read" });
  } catch {
    return "prompt";
  }
}

/** Re-requests read access. Must be called from a user gesture. */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const state = await handlePermission(handle);
  if (state === "granted") return true;
  const h = handle as PermissionCapableHandle;
  if (!h.requestPermission) return false;
  try {
    return (await h.requestPermission({ mode: "read" })) === "granted";
  } catch (error) {
    log.warn("media", "permission request rejected", error);
    return false;
  }
}

/** Walks a validated relative path from the root handle. */
export async function resolveDirectory(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  assertSafePath(segments);
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }
  return current;
}

export async function resolveFile(
  root: FileSystemDirectoryHandle,
  segments: string[],
  fileName: string,
): Promise<File> {
  assertSafeSegment(fileName);
  const dir = await resolveDirectory(root, segments);
  const handle = await dir.getFileHandle(fileName);
  return handle.getFile();
}

/** Verifies that a stored root is still reachable. */
export async function rootIsReachable(root: RootRecord): Promise<boolean> {
  try {
    if ((await handlePermission(root.handle)) !== "granted") return false;
    // Touching the iterator confirms the folder still exists.
    const iterator = (root.handle as unknown as { values: () => AsyncIterableIterator<FileSystemHandle> }).values();
    await iterator.next();
    return true;
  } catch {
    return false;
  }
}
