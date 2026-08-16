import type { MediaItem } from "@/lib/core/types";
import { probeItem, saveProbe, thumbnailUrl } from "@/lib/media/mediaService";

type Listener = (url: string | null) => void;

const queue: MediaItem[] = [];
const queued = new Set<string>();
const listeners = new Map<string, Set<Listener>>();
let active = 0;
const MAX_ACTIVE = 1;

function notify(id: string, url: string | null) {
  listeners.get(id)?.forEach((listener) => listener(url));
}

async function run() {
  if (active >= MAX_ACTIVE) return;
  const item = queue.shift();
  if (!item) return;
  active += 1;
  try {
    const probe = await probeItem(item, { thumbnail: true });
    if (!probe.error) await saveProbe(item, probe);
    notify(item.id, await thumbnailUrl(item.id));
  } catch {
    notify(item.id, null);
  } finally {
    active -= 1;
    queued.delete(item.id);
    window.setTimeout(() => void run(), 60);
  }
}

export function queueThumbnail(item: MediaItem) {
  if (item.kind !== "video" || !item.directPlay || queued.has(item.id)) return;
  queued.add(item.id);
  queue.push(item);
  window.setTimeout(() => void run(), 0);
}

export function subscribeThumbnail(item: MediaItem, listener: Listener): () => void {
  const set = listeners.get(item.id) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(item.id, set);
  queueThumbnail(item);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(item.id);
  };
}