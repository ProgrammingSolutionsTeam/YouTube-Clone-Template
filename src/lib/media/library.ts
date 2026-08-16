/**
 * Query layer over the local index.
 *
 * Every list in the UI (home, browse, channels, search, history) is built here
 * so all of them can produce *complete* locations (`root=…&c=…&c1=…&v=…`)
 * instead of bare file ids.
 */

import { channelsStore, itemsStore, rootsStore, STORE, getAll } from "../core/indexdb";
import type { MediaItem, RootRecord } from "../core/types";
import type { MediaLocation } from "../core/paths";

let cache: { at: number; items: MediaItem[] } | null = null;

export function invalidateLibrary(): void {
  cache = null;
}

export async function allItems(): Promise<MediaItem[]> {
  if (cache && Date.now() - cache.at < 4000) return cache.items;
  const items = await getAll<MediaItem>(STORE.items);
  cache = { at: Date.now(), items };
  return items;
}

export async function listRoots(): Promise<RootRecord[]> {
  return rootsStore.all();
}

export async function rootByKey(key: string): Promise<RootRecord | undefined> {
  const roots = await rootsStore.all();
  return roots.find((r) => r.name.toLowerCase() === key.toLowerCase());
}

export async function rootKeyMap(): Promise<Map<string, string>> {
  const roots = await rootsStore.all();
  return new Map(roots.map((r) => [r.id, r.name]));
}

/** The complete, shareable location of an item. */
export function locationOf(item: MediaItem, rootKey?: string): MediaLocation {
  return { rootKey: rootKey ?? item.rootName, segments: item.dirPath, videoId: item.id };
}

export type SortBy = "recent" | "title" | "size" | "duration";

export function sortItems(items: MediaItem[], sortBy: SortBy): MediaItem[] {
  const out = [...items];
  switch (sortBy) {
    case "title":
      out.sort((a, b) => a.title.localeCompare(b.title, "ar"));
      break;
    case "size":
      out.sort((a, b) => b.size - a.size);
      break;
    case "duration":
      out.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
      break;
    default:
      out.sort((a, b) => b.fileModifiedAt - a.fileModifiedAt);
  }
  return out;
}

export interface ListOptions {
  kind?: "all" | "video" | "audio";
  sortBy?: SortBy;
  hideUnavailable?: boolean;
  limit?: number;
  rootId?: string;
}

export async function listItems(options: ListOptions = {}): Promise<MediaItem[]> {
  const { kind = "all", sortBy = "recent", hideUnavailable = true, limit, rootId } = options;
  let items = await allItems();
  if (rootId) items = items.filter((i) => i.rootId === rootId);
  if (kind !== "all") items = items.filter((i) => i.kind === kind);
  if (hideUnavailable) items = items.filter((i) => i.available !== false);
  const sorted = sortItems(items, sortBy);
  return limit ? sorted.slice(0, limit) : sorted;
}

export interface FolderNode {
  name: string;
  /** segments relative to the root, including this folder */
  segments: string[];
  itemCount: number;
  folderCount: number;
  lastModifiedAt: number;
  posterItemId?: string;
}

export interface LocationListing {
  root?: RootRecord;
  folders: FolderNode[];
  items: MediaItem[];
  totalDeep: number;
}

/** Lists the direct children (folders + files) of a location. */
export async function listLocation(rootKey: string, segments: string[]): Promise<LocationListing> {
  const root = await rootByKey(rootKey);
  if (!root) return { folders: [], items: [], totalDeep: 0 };
  const items = (await allItems()).filter((i) => i.rootId === root.id);

  const matchesPrefix = (item: MediaItem) =>
    segments.every((segment, index) => item.dirPath[index] === segment);

  const inside = items.filter(matchesPrefix);
  const here = inside.filter((i) => i.dirPath.length === segments.length);
  const deeper = inside.filter((i) => i.dirPath.length > segments.length);

  const folderMap = new Map<string, FolderNode>();
  for (const item of deeper) {
    const name = item.dirPath[segments.length];
    const key = name;
    const node =
      folderMap.get(key) ??
      ({
        name,
        segments: [...segments, name],
        itemCount: 0,
        folderCount: 0,
        lastModifiedAt: 0,
        posterItemId: undefined,
      } satisfies FolderNode);
    node.itemCount += 1;
    node.lastModifiedAt = Math.max(node.lastModifiedAt, item.fileModifiedAt);
    if (!node.posterItemId && item.hasThumbnail) node.posterItemId = item.id;
    if (!node.posterItemId) node.posterItemId = item.id;
    if (item.dirPath.length > segments.length + 1) node.folderCount += 1;
    folderMap.set(key, node);
  }

  const folders = [...folderMap.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return { root, folders, items: sortItems(here, "recent"), totalDeep: inside.length };
}

/** Stable playlist order used by the player, related list and autoplay. */
export function playbackOrder(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) =>
    a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: "base" }),
  );
}

export function adjacentItems(items: MediaItem[], currentId: string) {
  const ordered = playbackOrder(items);
  const index = ordered.findIndex((entry) => entry.id === currentId);
  return {
    ordered,
    previous: index > 0 ? ordered[index - 1] : undefined,
    next: index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined,
  };
}

/** Top level folders of every root => the channel list. */
export async function listChannels(): Promise<
  { rootKey: string; name: string; segments: string[]; itemCount: number; playlistCount: number; posterItemId?: string; lastModifiedAt: number }[]
> {
  const roots = await rootsStore.all();
  const items = await allItems();
  const byKey = new Map<string, { rootKey: string; name: string; segments: string[]; itemCount: number; playlistCount: number; posterItemId?: string; lastModifiedAt: number }>();
  const playlists = new Map<string, Set<string>>();

  for (const item of items) {
    const root = roots.find((r) => r.id === item.rootId);
    if (!root || item.dirPath.length === 0) continue;
    const channel = item.dirPath[0];
    const key = `${root.name}/${channel}`;
    const node =
      byKey.get(key) ??
      {
        rootKey: root.name,
        name: channel,
        segments: [channel],
        itemCount: 0,
        playlistCount: 0,
        posterItemId: undefined,
        lastModifiedAt: 0,
      };
    node.itemCount += 1;
    node.lastModifiedAt = Math.max(node.lastModifiedAt, item.fileModifiedAt);
    if (!node.posterItemId) node.posterItemId = item.id;
    byKey.set(key, node);
    if (item.dirPath.length > 1) {
      const set = playlists.get(key) ?? new Set<string>();
      set.add(item.dirPath.slice(1).join("/"));
      playlists.set(key, set);
    }
  }

  for (const [key, set] of playlists) {
    const node = byKey.get(key);
    if (node) node.playlistCount = set.size;
  }

  return [...byKey.values()].sort((a, b) => b.itemCount - a.itemCount);
}

export async function searchLibrary(query: string, limit = 80): Promise<MediaItem[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const items = await allItems();
  const words = needle.split(/\s+/);
  const hits = items.filter((item) => {
    const hay = `${item.search ?? ""} ${item.title} ${item.dirPath.join(" ")}`.toLowerCase();
    return words.every((word) => hay.includes(word));
  });
  return sortItems(hits, "recent").slice(0, limit);
}

export async function itemsByIds(ids: string[]): Promise<MediaItem[]> {
  const items = await allItems();
  const map = new Map(items.map((i) => [i.id, i]));
  return ids.map((id) => map.get(id)).filter((i): i is MediaItem => Boolean(i));
}

export async function channelCount(): Promise<number> {
  const rows = await channelsStore.all();
  return rows.length;
}

export async function libraryStats(): Promise<{ items: number; roots: number; channels: number; totalSize: number; totalDuration: number }> {
  const [items, roots] = await Promise.all([allItems(), rootsStore.all()]);
  const channels = new Set(items.filter((i) => i.dirPath.length).map((i) => `${i.rootId}/${i.dirPath[0]}`));
  return {
    items: items.length,
    roots: roots.length,
    channels: channels.size,
    totalSize: items.reduce((sum, i) => sum + (i.size || 0), 0),
    totalDuration: items.reduce((sum, i) => sum + (i.duration ?? 0), 0),
  };
}

export async function getItemById(id: string): Promise<MediaItem | null> {
  return (await itemsStore.get(id)) ?? null;
}
