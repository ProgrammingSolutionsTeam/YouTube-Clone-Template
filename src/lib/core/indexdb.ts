/**
 * Local index (IndexedDB).
 *
 * This is the "database" of the media service: the scanner writes here once and
 * every page reads from here. Nothing re-walks the filesystem per request.
 * Works identically on the main thread and inside the scanner worker.
 */

import type {
  ChannelRecord,
  LogEntry,
  MediaItem,
  PlaylistRecord,
  RootRecord,
} from "./types";

const DB_NAME = "medialib";
const DB_VERSION = 1;

export const STORE = {
  roots: "roots",
  items: "items",
  channels: "channels",
  playlists: "playlists",
  thumbs: "thumbs",
  aliases: "aliases",
  logs: "logs",
  meta: "meta",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openIndex(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE.roots)) {
        db.createObjectStore(STORE.roots, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.items)) {
        const items = db.createObjectStore(STORE.items, { keyPath: "id" });
        items.createIndex("byModified", "fileModifiedAt");
        items.createIndex("byChannel", "channelId");
        items.createIndex("byPlaylist", "playlistId");
        items.createIndex("byRoot", "rootId");
        items.createIndex("byKind", "kind");
        items.createIndex("byFingerprint", ["rootId", "size", "fileModifiedAt"]);
      }
      if (!db.objectStoreNames.contains(STORE.channels)) {
        const channels = db.createObjectStore(STORE.channels, { keyPath: "id" });
        channels.createIndex("byRoot", "rootId");
      }
      if (!db.objectStoreNames.contains(STORE.playlists)) {
        const playlists = db.createObjectStore(STORE.playlists, { keyPath: "id" });
        playlists.createIndex("byChannel", "channelId");
        playlists.createIndex("byRoot", "rootId");
      }
      if (!db.objectStoreNames.contains(STORE.thumbs)) {
        db.createObjectStore(STORE.thumbs, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.aliases)) {
        db.createObjectStore(STORE.aliases, { keyPath: "oldId" });
      }
      if (!db.objectStoreNames.contains(STORE.logs)) {
        const logs = db.createObjectStore(STORE.logs, { keyPath: "id", autoIncrement: true });
        logs.createIndex("byAt", "at");
      }
      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.createObjectStore(STORE.meta, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function run<T>(store: IDBObjectStore | IDBIndex, request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function tx(stores: string[], mode: IDBTransactionMode): Promise<IDBTransaction> {
  const db = await openIndex();
  return db.transaction(stores, mode);
}

export async function put<T>(storeName: string, value: T): Promise<void> {
  const t = await tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  await run(store, store.put(value as unknown as never));
  await done(t);
}

export async function putMany<T>(storeName: string, values: T[]): Promise<void> {
  if (!values.length) return;
  const t = await tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  for (const value of values) store.put(value as unknown as never);
  await done(t);
}

export async function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const t = await tx([storeName], "readonly");
  const store = t.objectStore(storeName);
  return (await run(store, store.get(key))) as T | undefined;
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const t = await tx([storeName], "readonly");
  const store = t.objectStore(storeName);
  return (await run(store, store.getAll())) as T[];
}

export async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const t = await tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  store.delete(key);
  await done(t);
}

export async function removeMany(storeName: string, keys: IDBValidKey[]): Promise<void> {
  if (!keys.length) return;
  const t = await tx([storeName], "readwrite");
  const store = t.objectStore(storeName);
  for (const key of keys) store.delete(key);
  await done(t);
}

export function done(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function count(storeName: string): Promise<number> {
  const t = await tx([storeName], "readonly");
  const store = t.objectStore(storeName);
  return run(store, store.count());
}

/** Streams an index in a direction, invoking the visitor until it returns false. */
export async function cursorEach<T>(
  storeName: string,
  indexName: string | null,
  direction: IDBCursorDirection,
  visit: (value: T) => boolean | void,
  query?: IDBKeyRange | IDBValidKey | null,
): Promise<void> {
  const t = await tx([storeName], "readonly");
  const store = t.objectStore(storeName);
  const source: IDBObjectStore | IDBIndex = indexName ? store.index(indexName) : store;
  await new Promise<void>((resolve, reject) => {
    const request = source.openCursor(query ?? null, direction);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve();
      const keepGoing = visit(cursor.value as T);
      if (keepGoing === false) return resolve();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

/* ---------------------------------------------------------------- typed API */

export const rootsStore = {
  all: () => getAll<RootRecord>(STORE.roots),
  get: (id: string) => get<RootRecord>(STORE.roots, id),
  put: (root: RootRecord) => put(STORE.roots, root),
  remove: (id: string) => remove(STORE.roots, id),
};

export const itemsStore = {
  get: (id: string) => get<MediaItem>(STORE.items, id),
  put: (item: MediaItem) => put(STORE.items, item),
  putMany: (items: MediaItem[]) => putMany(STORE.items, items),
  removeMany: (ids: string[]) => removeMany(STORE.items, ids),
  count: () => count(STORE.items),
};

export const channelsStore = {
  all: () => getAll<ChannelRecord>(STORE.channels),
  get: (id: string) => get<ChannelRecord>(STORE.channels, id),
  putMany: (rows: ChannelRecord[]) => putMany(STORE.channels, rows),
  removeMany: (ids: string[]) => removeMany(STORE.channels, ids),
};

export const playlistsStore = {
  all: () => getAll<PlaylistRecord>(STORE.playlists),
  get: (id: string) => get<PlaylistRecord>(STORE.playlists, id),
  putMany: (rows: PlaylistRecord[]) => putMany(STORE.playlists, rows),
  removeMany: (ids: string[]) => removeMany(STORE.playlists, ids),
};

export const thumbsStore = {
  get: (id: string) => get<{ id: string; blob: Blob; at: number }>(STORE.thumbs, id),
  put: (id: string, blob: Blob) => put(STORE.thumbs, { id, blob, at: Date.now() }),
  clear: async () => {
    const t = await tx([STORE.thumbs], "readwrite");
    t.objectStore(STORE.thumbs).clear();
    await done(t);
  },
  count: () => count(STORE.thumbs),
};

export const aliasStore = {
  /** resolves a stale id (renamed file) to the current id */
  resolve: async (id: string): Promise<string> => {
    let current = id;
    for (let hop = 0; hop < 5; hop++) {
      const row = await get<{ oldId: string; newId: string }>(STORE.aliases, current);
      if (!row) break;
      current = row.newId;
    }
    return current;
  },
  put: (oldId: string, newId: string) => put(STORE.aliases, { oldId, newId, at: Date.now() }),
};

export const metaStore = {
  get: async <T>(key: string): Promise<T | undefined> => {
    const row = await get<{ key: string; value: T }>(STORE.meta, key);
    return row?.value;
  },
  set: <T>(key: string, value: T) => put(STORE.meta, { key, value }),
};

const MAX_LOGS = 2000;

export const logStore = {
  append: async (entry: LogEntry) => {
    await put(STORE.logs, entry);
    const total = await count(STORE.logs);
    if (total > MAX_LOGS) {
      const t = await tx([STORE.logs], "readwrite");
      const store = t.objectStore(STORE.logs);
      const cutoff = total - MAX_LOGS;
      let deleted = 0;
      await new Promise<void>((resolve) => {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor || deleted >= cutoff) return resolve();
          cursor.delete();
          deleted++;
          cursor.continue();
        };
        request.onerror = () => resolve();
      });
      await done(t);
    }
  },
  recent: async (limit = 300): Promise<LogEntry[]> => {
    const out: LogEntry[] = [];
    await cursorEach<LogEntry>(STORE.logs, "byAt", "prev", (value) => {
      out.push(value);
      return out.length < limit;
    });
    return out;
  },
  clear: async () => {
    const t = await tx([STORE.logs], "readwrite");
    t.objectStore(STORE.logs).clear();
    await done(t);
  },
};

/** Wipes every derived record but keeps the registered roots. */
export async function resetIndex(): Promise<void> {
  const t = await tx([STORE.items, STORE.channels, STORE.playlists, STORE.thumbs, STORE.aliases], "readwrite");
  for (const name of [STORE.items, STORE.channels, STORE.playlists, STORE.thumbs, STORE.aliases]) {
    t.objectStore(name).clear();
  }
  await done(t);
}
