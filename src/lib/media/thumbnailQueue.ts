import type { MediaItem } from "@/lib/core/types";
import { probeItem, saveProbe, thumbnailUrl } from "@/lib/media/mediaService";

type Listener = (url: string | null) => void;

const queue: MediaItem[] = [];
const queued = new Set<string>();
const listeners = new Map<string, Set<Listener>>();
let active = 0;
const MAX_ACTIVE = 1;

async function notify(id: string) {
  // Each card owns its own URL; unmounting one must not revoke another's image.
  for (const listener of [...(listeners.get(id) ?? [])]) {
    const url = await thumbnailUrl(id);
    if (listeners.get(id)?.has(listener)) listener(url);
    else if (url) URL.revokeObjectURL(url);
  }
}

async function run() {
  if (active >= MAX_ACTIVE) return;
  const item = queue.shift();
  if (!item) return;
  active += 1;
  try {
    const cached = await thumbnailUrl(item.id);
    if (cached) {
      URL.revokeObjectURL(cached);
      await notify(item.id);
      return;
    }
    const probe = await probeItem(item, { thumbnail: true });
    if (!probe.error) await saveProbe(item, probe);
    await notify(item.id);
  } catch {
    listeners.get(item.id)?.forEach(listener => listener(null));
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
    if (!set.size) {
      listeners.delete(item.id);
      const index = queue.findIndex(q => q.id === item.id);
      if (index >= 0) { queue.splice(index, 1); queued.delete(item.id); }
    }
  };
}