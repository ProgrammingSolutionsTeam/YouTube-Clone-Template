/** Data model shared by the scanner, the index and the UI. */

export type MediaKind = "video" | "audio";

/** A registered content source. The handle is device-local and never leaves it. */
export interface RootRecord {
  id: string;
  /** short name given by the admin, e.g. "A" */
  name: string;
  /** optional descriptive label */
  label?: string;
  /** the granted directory handle — only reachable from this browser profile */
  handle: FileSystemDirectoryHandle;
  createdAt: number;
  lastScanAt?: number;
  itemCount?: number;
}

export interface SubtitleRecord {
  /** opaque id used by the protected download/serve path */
  id: string;
  language: string | null;
  label: string;
  format: string;
  /** file name only, resolved against the parent directory at request time */
  fileName: string;
  size: number;
  forced: boolean;
  sdh: boolean;
}

export interface QualityVariant {
  id: string;
  label: string;
  fileName: string;
  size: number;
  height?: number;
}

export interface MediaItem {
  /** opaque public id, the only identifier the user ever sees */
  id: string;
  rootId: string;
  rootName: string;
  kind: MediaKind;
  /** display title derived from the file name */
  title: string;
  fileName: string;
  /** path segments relative to the root, directories only (kept server/local side) */
  dirPath: string[];
  /** top level folder inside the root => channel */
  channel: string;
  channelId: string;
  /** nested folder path => playlist (last segment is the playlist name) */
  playlist: string | null;
  playlistId: string | null;
  extension: string;
  container: string;
  mimeType: string;
  detectionConfidence: string;
  size: number;
  /** filesystem modified time — drives "Latest" ordering */
  fileModifiedAt: number;
  indexedAt: number;
  available: boolean;
  /** true when the browser can decode this container without help */
  directPlay: boolean;
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  audioTrackCount?: number;
  hasThumbnail: boolean;
  /** metadata enrichment state */
  probed: boolean;
  probeError?: string;
  subtitles: SubtitleRecord[];
  qualities: QualityVariant[];
  tags: string[];
  /** lowercase haystack used by the search index */
  search: string;
}

export interface ChannelRecord {
  id: string;
  name: string;
  rootId: string;
  rootName: string;
  itemCount: number;
  playlistCount: number;
  lastModifiedAt: number;
  colorSeed: number;
  posterItemId?: string;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  channelId: string;
  channel: string;
  rootId: string;
  path: string[];
  itemCount: number;
  lastModifiedAt: number;
}

export interface ScanIssue {
  path: string;
  message: string;
  level: "WARNING" | "ERROR";
  at: number;
}

export interface ScanProgress {
  rootId: string;
  rootName: string;
  state: "idle" | "scanning" | "cancelling" | "done" | "error";
  directoriesSeen: number;
  filesSeen: number;
  mediaFound: number;
  subtitlesFound: number;
  added: number;
  updated: number;
  removed: number;
  renamed: number;
  currentPath: string;
  startedAt: number;
  finishedAt?: number;
  issues: ScanIssue[];
  error?: string;
}

export interface LogEntry {
  id?: number;
  at: number;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  category: "scanner" | "media" | "auth" | "admin" | "player" | "system";
  message: string;
  details?: unknown;
}
