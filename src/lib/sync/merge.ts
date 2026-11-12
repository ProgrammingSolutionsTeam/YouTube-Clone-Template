import type { AppSettings, FavoritesFile, HistoryEntry, WatchLaterFile } from "../vault/settings";

export interface Mutation { at: number; deleted: boolean }
export type Mutations = Record<string, Mutation>;
export interface RemoteItem { media_id: string; deleted: boolean; at?: string | number }
export function mergeCollection(local: string[], mutations: Mutations = {}, remote: RemoteItem[]) {
  const state: Mutations = { ...mutations };
  local.forEach(id => { state[id] ??= { at: 0, deleted: false }; });
  remote.forEach(item => {
    const at = Number(item.at) || 0;
    if (!state[item.media_id] || at > state[item.media_id].at) state[item.media_id] = { at, deleted: item.deleted };
  });
  return { items: Object.keys(state).filter(id => !state[id].deleted), mutations: state };
}
export function mergeHistory(local: HistoryEntry[], mutations: Mutations = {}, remote: (RemoteItem & { title: string | null; position: number; duration: number | null })[]) {
  const merged = mergeCollection(local.map(h => h.id), mutations, remote);
  const entries = new Map(local.map(h => [h.id, h]));
  remote.forEach(h => {
    const old = entries.get(h.media_id);
    if (!old || Number(h.at) > old.at) entries.set(h.media_id, {
      ...old, id: h.media_id, title: h.title ?? old?.title ?? "", rootKey: old?.rootKey ?? "",
      segments: old?.segments ?? [], channel: old?.channel ?? "", position: h.position,
      duration: h.duration ?? 0, at: Number(h.at), count: old?.count ?? 1,
    });
  });
  return { entries: merged.items.flatMap(id => { const h = entries.get(id); return h ? [h] : []; }).sort((a,b) => b.at-a.at), mutations: merged.mutations };
}

/** Three-way field merge; differing changes to the same leaf require a choice. */
export function mergeSettingsConflict(base: unknown, local: unknown, remote: unknown): { value: unknown; conflict: boolean } {
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (equal(local, remote) || equal(remote, base)) return { value: local, conflict: false };
  if (equal(local, base)) return { value: remote, conflict: false };
  const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
  if (object(local) && object(remote)) {
    const value: Record<string, unknown> = {};
    let conflict = false;
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const result = mergeSettingsConflict(object(base) ? base[key] : undefined, local[key], remote[key]);
      value[key] = result.value; conflict ||= result.conflict;
    }
    return { value, conflict };
  }
  return { value: local, conflict: true };
}
export interface SyncProfile { settings?: Partial<AppSettings>; favorites: FavoritesFile; watchLater: WatchLaterFile; history: HistoryEntry[] }