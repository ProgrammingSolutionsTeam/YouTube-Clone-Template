/**
 * Local vault (IndexedDB).
 *
 * Replaces any remote backend: accounts, sessions and every per-profile file
 * live on this device only. Each profile owns a *folder*:
 *
 *   default/              -> factory defaults for anonymous browsing
 *   sessions/<sessionId>/ -> a visitor that never signed in
 *   users/<slug>/         -> a real account (folder is renamed on sign-up)
 *
 * Inside a folder every file (settings.json, favorites.json, history.json, ...)
 * is stored encrypted with the folder key. Without the key the rows are opaque.
 */

import { open, seal, type SealedPayload } from "./crypto";

const DB_NAME = "medialib-vault";
const DB_VERSION = 1;

export const VSTORE = {
  users: "users",
  files: "files",
  session: "session",
} as const;

export interface UserRecord {
  slug: string;
  displayName: string;
  email: string;
  /** base64 PBKDF2 verifier */
  verifier: string;
  verifierSalt: string;
  kekSalt: string;
  wrappedDek: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  avatarColor: string;
  role: "admin" | "user";
}

export interface FileRecord extends SealedPayload {
  path: string;
  folder: string;
  name: string;
  at: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openVault(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VSTORE.users)) {
        const users = db.createObjectStore(VSTORE.users, { keyPath: "slug" });
        users.createIndex("byEmail", "email", { unique: true });
      }
      if (!db.objectStoreNames.contains(VSTORE.files)) {
        const files = db.createObjectStore(VSTORE.files, { keyPath: "path" });
        files.createIndex("byFolder", "folder");
      }
      if (!db.objectStoreNames.contains(VSTORE.session)) {
        db.createObjectStore(VSTORE.session, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  name: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openVault();
  const tx = db.transaction([name], mode);
  const result = await fn(tx.objectStore(name));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return result;
}

/* ----------------------------------------------------------------- accounts */

export const users = {
  all: () => withStore(VSTORE.users, "readonly", (s) => request<UserRecord[]>(s.getAll())),
  get: (slug: string) => withStore(VSTORE.users, "readonly", (s) => request<UserRecord | undefined>(s.get(slug))),
  async byEmail(email: string): Promise<UserRecord | undefined> {
    const all = await users.all();
    const needle = email.trim().toLowerCase();
    return all.find((u) => u.email.toLowerCase() === needle);
  },
  put: (user: UserRecord) => withStore(VSTORE.users, "readwrite", (s) => request(s.put(user))),
  remove: (slug: string) => withStore(VSTORE.users, "readwrite", (s) => request(s.delete(slug))),
  count: () => withStore(VSTORE.users, "readonly", (s) => request<number>(s.count())),
};

/* -------------------------------------------------------------------- files */

export const vaultFiles = {
  async read(folder: string, name: string): Promise<FileRecord | undefined> {
    return withStore(VSTORE.files, "readonly", (s) =>
      request<FileRecord | undefined>(s.get(`${folder}/${name}`)),
    );
  },
  async write(folder: string, name: string, payload: SealedPayload): Promise<void> {
    const row: FileRecord = { path: `${folder}/${name}`, folder, name, at: Date.now(), ...payload };
    await withStore(VSTORE.files, "readwrite", (s) => request(s.put(row)));
  },
  async list(folder: string): Promise<FileRecord[]> {
    return withStore(VSTORE.files, "readonly", (s) =>
      request<FileRecord[]>(s.index("byFolder").getAll(folder)),
    );
  },
  async removeFolder(folder: string): Promise<void> {
    const rows = await vaultFiles.list(folder);
    await withStore(VSTORE.files, "readwrite", (s) => {
      for (const row of rows) s.delete(row.path);
      return Promise.resolve();
    });
  },
};

/** Sealed read/write helpers bound to one folder + key. */
export async function readSealed<T>(folder: string, name: string, key: CryptoKey): Promise<T | null> {
  const row = await vaultFiles.read(folder, name);
  if (!row) return null;
  try {
    return await open<T>(key, { iv: row.iv, data: row.data });
  } catch {
    return null;
  }
}

export async function writeSealed(folder: string, name: string, key: CryptoKey, value: unknown): Promise<void> {
  await vaultFiles.write(folder, name, await seal(key, value));
}

/**
 * Moves an anonymous session folder into a user folder, re-encrypting every
 * file with the new account key.
 */
export async function migrateFolder(
  from: { folder: string; key: CryptoKey },
  to: { folder: string; key: CryptoKey },
): Promise<void> {
  const rows = await vaultFiles.list(from.folder);
  for (const row of rows) {
    try {
      const value = await open<unknown>(from.key, { iv: row.iv, data: row.data });
      await writeSealed(to.folder, row.name, to.key, value);
    } catch {
      /* unreadable row is dropped rather than corrupting the new folder */
    }
  }
  await vaultFiles.removeFolder(from.folder);
}

/* ------------------------------------------------------------------ session */

interface SessionRow {
  key: "current";
  slug: string | null;
  sessionId: string;
  at: number;
}

export const sessionStore = {
  async get(): Promise<SessionRow | undefined> {
    return withStore(VSTORE.session, "readonly", (s) => request<SessionRow | undefined>(s.get("current")));
  },
  async set(slug: string | null, sessionId: string): Promise<void> {
    const row: SessionRow = { key: "current", slug, sessionId, at: Date.now() };
    await withStore(VSTORE.session, "readwrite", (s) => request(s.put(row)));
  },
};

/** Full local wipe (accounts + profile files). Used by "reset app". */
export async function wipeVault(): Promise<void> {
  const db = await openVault();
  const tx = db.transaction([VSTORE.users, VSTORE.files, VSTORE.session], "readwrite");
  tx.objectStore(VSTORE.users).clear();
  tx.objectStore(VSTORE.files).clear();
  tx.objectStore(VSTORE.session).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
