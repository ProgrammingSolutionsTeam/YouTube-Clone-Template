/**
 * Short-video selection for the Scrolling feed.
 *
 * A video counts as short when its probed duration is within the limit
 * (optionally portrait only). Unprobed files are judged by size until the
 * thumbnail queue probes them. The feed order is shuffled on every visit and,
 * when asked, clips seen recently are pushed to the end so they don't repeat.
 */
import type { MediaItem } from "@/lib/core/types";
import type { ShortsSettings } from "@/lib/vault/settings";
import { allItems } from "@/lib/media/library";

const SEEN_KEY = "localtube.shorts.seen";
const SEEN_LIMIT = 400;

export function isShort(item: MediaItem, s: ShortsSettings): boolean {
  if (item.kind !== "video" || !item.available || !item.directPlay) return false;
  if (item.duration && item.duration > 0) {
    if (item.duration > s.maxDuration) return false;
    if (s.verticalOnly && item.width && item.height && item.height <= item.width) return false;
    return true;
  }
  if (s.verticalOnly && item.width && item.height && item.height <= item.width) return false;
  return item.size > 0 && item.size <= s.maxSizeMB * 1024 * 1024;
}

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function markSeen(id: string) {
  const seen = readSeen().filter((x) => x !== id);
  seen.unshift(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(0, SEEN_LIMIT)));
}

export function clearSeen() {
  localStorage.removeItem(SEEN_KEY);
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  const rnd = new Uint32Array(a.length);
  crypto.getRandomValues(rnd);
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function shortsFeed(s: ShortsSettings): Promise<MediaItem[]> {
  const items = (await allItems()).filter((item) => isShort(item, s));
  if (!s.shuffle) return items.sort((a, b) => b.fileModifiedAt - a.fileModifiedAt);
  if (!s.avoidRepeats) return shuffle(items);
  const seen = readSeen();
  const rank = new Map(seen.map((id, i) => [id, i]));
  const fresh = shuffle(items.filter((i) => !rank.has(i.id)));
  // seen ones: least recently seen first, lightly shuffled within
  const old = items.filter((i) => rank.has(i.id)).sort((a, b) => rank.get(b.id)! - rank.get(a.id)!);
  return [...fresh, ...old];
}
