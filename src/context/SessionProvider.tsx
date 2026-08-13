/**
 * Session + profile provider (fully local, no remote backend).
 *
 * Folder layout inside the encrypted vault:
 *   default/               factory defaults, seeded once
 *   sessions/<sessionId>/  anonymous visitor (created on first visit)
 *   users/<slug>/          account folder (session folder is migrated into it)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createDek,
  deriveDeviceKey,
  deriveKek,
  fromBase64,
  newSessionId,
  passwordVerifier,
  randomBytes,
  slugify,
  toBase64,
  unwrapDek,
  wrapDek,
  constantTimeEqual,
} from "@/lib/vault/crypto";
import {
  migrateFolder,
  readSealed,
  sessionStore,
  users,
  vaultFiles,
  wipeVault,
  writeSealed,
  type UserRecord,
} from "@/lib/vault/vault";
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  FILES,
  mergeSettings,
  type AppSettings,
  type FavoritesFile,
  type HistoryEntry,
  type HistoryFile,
  type WatchLaterFile,
} from "@/lib/vault/settings";
import { dirFor, translate } from "@/lib/i18n";
import { resetIndex } from "@/lib/core/indexdb";
import { invalidateLibrary } from "@/lib/media/library";

const DEVICE_SECRET_KEY = "medialib.device.secret";
const DEVICE_SALT_KEY = "medialib.device.salt";
const SESSION_KEY = "medialib.session.id";

export interface PublicUser {
  slug: string;
  displayName: string;
  email: string;
  role: "admin" | "user";
  avatarColor: string;
  createdAt: number;
}

interface SessionValue {
  ready: boolean;
  user: PublicUser | null;
  folder: string;
  settings: AppSettings;
  favorites: FavoritesFile;
  watchLater: WatchLaterFile;
  history: HistoryEntry[];
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  updateSettings: (patch: DeepPartial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<boolean>;
  toggleFavoriteChannel: (key: string) => Promise<boolean>;
  toggleWatchLater: (id: string) => Promise<boolean>;
  recordWatch: (entry: Omit<HistoryEntry, "count">) => Promise<void>;
  clearHistory: () => Promise<void>;
  signUp: (input: { displayName: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateAccount: (input: { displayName?: string; email?: string; currentPassword: string; newPassword?: string }) => Promise<void>;
  exportData: () => Promise<string>;
  wipeEverything: () => Promise<void>;
  accountCount: number;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const SessionContext = createContext<SessionValue | null>(null);

function deviceSecret(): { secret: string; salt: Uint8Array } {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    secret = toBase64(randomBytes(32));
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  let saltRaw = localStorage.getItem(DEVICE_SALT_KEY);
  if (!saltRaw) {
    saltRaw = toBase64(randomBytes(16));
    localStorage.setItem(DEVICE_SALT_KEY, saltRaw);
  }
  return { secret, salt: fromBase64(saltRaw) };
}

function sessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = newSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function applyAppearance(settings: AppSettings) {
  const root = document.documentElement;
  const accent = ACCENTS.find((a) => a.key === settings.accent) ?? ACCENTS[0];
  root.style.setProperty("--youtube-red", accent.hsl);
  root.style.setProperty("--primary", accent.hsl);
  root.style.setProperty("--ring", accent.hsl);
  root.style.setProperty("--sidebar-primary", accent.hsl);
  root.style.fontSize = `${Math.round(settings.fontScale * 100)}%`;
  root.lang = settings.language;
  root.dir = dirFor(settings.language);
  root.classList.toggle("reduce-motion", settings.reduceMotion);

  const dark =
    settings.theme === "dark" ||
    (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [folder, setFolder] = useState<string>("default");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [favorites, setFavorites] = useState<FavoritesFile>({ items: [], channels: [] });
  const [watchLater, setWatchLater] = useState<WatchLaterFile>({ items: [] });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const keyRef = useRef<CryptoKey | null>(null);

  const loadProfile = useCallback(async (nextFolder: string, key: CryptoKey) => {
    keyRef.current = key;
    setFolder(nextFolder);

    let stored = await readSealed<Partial<AppSettings>>(nextFolder, FILES.settings, key);
    if (!stored) {
      // seed from the shared `default` folder when it is readable
      const seeded = await readSealed<Partial<AppSettings>>("default", FILES.settings, key);
      stored = seeded ?? null;
      await writeSealed(nextFolder, FILES.settings, key, mergeSettings(stored));
    }
    const merged = mergeSettings(stored);
    setSettings(merged);
    applyAppearance(merged);

    setFavorites((await readSealed<FavoritesFile>(nextFolder, FILES.favorites, key)) ?? { items: [], channels: [] });
    setWatchLater((await readSealed<WatchLaterFile>(nextFolder, FILES.watchLater, key)) ?? { items: [] });
    setHistory(((await readSealed<HistoryFile>(nextFolder, FILES.history, key)) ?? { entries: [] }).entries);
  }, []);

  /* ------------------------------------------------------------- bootstrap */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { secret, salt } = deviceSecret();
      const deviceKey = await deriveDeviceKey(secret, salt);

      // factory defaults folder, readable by the device key
      if (!(await vaultFiles.read("default", FILES.settings))) {
        await writeSealed("default", FILES.settings, deviceKey, DEFAULT_SETTINGS);
      }

      setAccountCount(await users.count());
      const saved = await sessionStore.get();

      if (saved?.slug) {
        const record = await users.get(saved.slug);
        // a signed-in session is only restored while the folder key is cached
        const cachedKey = sessionKeyCache.get(saved.slug);
        if (record && cachedKey) {
          if (cancelled) return;
          setUser(toPublic(record));
          await loadProfile(`users/${record.slug}`, cachedKey);
          setReady(true);
          return;
        }
        if (record && !cachedKey) await sessionStore.set(null, sessionId());
      }

      if (cancelled) return;
      await loadProfile(`sessions/${sessionId()}`, deviceKey);
      await sessionStore.set(null, sessionId());
      setReady(true);
    })().catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  // follow the OS theme while "system" is selected
  useEffect(() => {
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyAppearance(settings);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [settings]);

  const persist = useCallback(
    async (name: string, value: unknown) => {
      if (!keyRef.current) return;
      await writeSealed(folder, name, keyRef.current, value);
    },
    [folder],
  );

  const updateSettings = useCallback(
    async (patch: DeepPartial<AppSettings>) => {
      const next = mergeSettings({
        ...settings,
        ...patch,
        library: { ...settings.library, ...(patch.library ?? {}) },
        player: { ...settings.player, ...(patch.player ?? {}) },
        privacy: { ...settings.privacy, ...(patch.privacy ?? {}) },
        scanner: { ...settings.scanner, ...(patch.scanner ?? {}) },
      } as AppSettings);
      setSettings(next);
      applyAppearance(next);
      await persist(FILES.settings, next);
    },
    [persist, settings],
  );

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    applyAppearance(DEFAULT_SETTINGS);
    await persist(FILES.settings, DEFAULT_SETTINGS);
  }, [persist]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const has = favorites.items.includes(id);
      const next: FavoritesFile = {
        ...favorites,
        items: has ? favorites.items.filter((x) => x !== id) : [id, ...favorites.items],
      };
      setFavorites(next);
      await persist(FILES.favorites, next);
      return !has;
    },
    [favorites, persist],
  );

  const toggleFavoriteChannel = useCallback(
    async (key: string) => {
      const has = favorites.channels.includes(key);
      const next: FavoritesFile = {
        ...favorites,
        channels: has ? favorites.channels.filter((x) => x !== key) : [key, ...favorites.channels],
      };
      setFavorites(next);
      await persist(FILES.favorites, next);
      return !has;
    },
    [favorites, persist],
  );

  const toggleWatchLater = useCallback(
    async (id: string) => {
      const has = watchLater.items.includes(id);
      const next: WatchLaterFile = {
        items: has ? watchLater.items.filter((x) => x !== id) : [id, ...watchLater.items],
      };
      setWatchLater(next);
      await persist(FILES.watchLater, next);
      return !has;
    },
    [persist, watchLater],
  );

  const recordWatch = useCallback(
    async (entry: Omit<HistoryEntry, "count">) => {
      if (!settings.privacy.saveHistory) return;
      const existing = history.find((h) => h.id === entry.id);
      const merged: HistoryEntry = {
        ...entry,
        position: settings.privacy.saveResumePositions ? entry.position : 0,
        count: (existing?.count ?? 0) + 1,
      };
      const next = [merged, ...history.filter((h) => h.id !== entry.id)].slice(0, settings.privacy.historyLimit);
      setHistory(next);
      await persist(FILES.history, { entries: next } satisfies HistoryFile);
    },
    [history, persist, settings.privacy],
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await persist(FILES.history, { entries: [] } satisfies HistoryFile);
  }, [persist]);

  /* ---------------------------------------------------------------- accounts */

  const signUp = useCallback(
    async ({ displayName, email, password }: { displayName: string; email: string; password: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (await users.byEmail(normalizedEmail)) throw new Error("account.exists");
      const existing = await users.all();
      let slug = slugify(displayName || normalizedEmail.split("@")[0]);
      if (existing.some((u) => u.slug === slug)) slug = `${slug}-${newSessionId().slice(0, 4).toLowerCase()}`;

      const kekSalt = randomBytes(16);
      const verifierSalt = randomBytes(16);
      const kek = await deriveKek(password, kekSalt);
      const dek = await createDek();
      const record: UserRecord = {
        slug,
        displayName: displayName.trim() || slug,
        email: normalizedEmail,
        verifier: await passwordVerifier(password, verifierSalt),
        verifierSalt: toBase64(verifierSalt),
        kekSalt: toBase64(kekSalt),
        wrappedDek: await wrapDek(dek, kek),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastLoginAt: Date.now(),
        avatarColor: ACCENTS[existing.length % ACCENTS.length].hsl,
        role: existing.length === 0 ? "admin" : "user",
      };
      await users.put(record);

      // move the anonymous session folder into the account folder
      const { secret, salt } = deviceSecret();
      const deviceKey = await deriveDeviceKey(secret, salt);
      await migrateFolder(
        { folder: `sessions/${sessionId()}`, key: deviceKey },
        { folder: `users/${slug}`, key: dek },
      );

      sessionKeyCache.set(slug, dek);
      await sessionStore.set(slug, sessionId());
      setUser(toPublic(record));
      setAccountCount(await users.count());
      await loadProfile(`users/${slug}`, dek);
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const record = await users.byEmail(email);
      if (!record) throw new Error("account.notFound");
      const verifier = await passwordVerifier(password, fromBase64(record.verifierSalt));
      if (!constantTimeEqual(verifier, record.verifier)) throw new Error("account.wrongPassword");
      const kek = await deriveKek(password, fromBase64(record.kekSalt));
      const dek = await unwrapDek(record.wrappedDek, kek);
      sessionKeyCache.set(record.slug, dek);
      await users.put({ ...record, lastLoginAt: Date.now() });
      await sessionStore.set(record.slug, sessionId());
      setUser(toPublic(record));
      await loadProfile(`users/${record.slug}`, dek);
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    if (user) sessionKeyCache.delete(user.slug);
    setUser(null);
    await sessionStore.set(null, sessionId());
    const { secret, salt } = deviceSecret();
    const deviceKey = await deriveDeviceKey(secret, salt);
    await loadProfile(`sessions/${sessionId()}`, deviceKey);
  }, [loadProfile, user]);

  const updateAccount = useCallback(
    async ({
      displayName,
      email,
      currentPassword,
      newPassword,
    }: {
      displayName?: string;
      email?: string;
      currentPassword: string;
      newPassword?: string;
    }) => {
      if (!user) throw new Error("account.notFound");
      const record = await users.get(user.slug);
      if (!record) throw new Error("account.notFound");
      const verifier = await passwordVerifier(currentPassword, fromBase64(record.verifierSalt));
      if (!constantTimeEqual(verifier, record.verifier)) throw new Error("account.wrongPassword");

      let next: UserRecord = { ...record, updatedAt: Date.now() };
      if (displayName?.trim()) next.displayName = displayName.trim();
      if (email?.trim()) {
        const normalized = email.trim().toLowerCase();
        const clash = await users.byEmail(normalized);
        if (clash && clash.slug !== record.slug) throw new Error("account.exists");
        next.email = normalized;
      }
      if (newPassword) {
        const kek = await deriveKek(currentPassword, fromBase64(record.kekSalt));
        const dek = await unwrapDek(record.wrappedDek, kek);
        const newKekSalt = randomBytes(16);
        const newVerifierSalt = randomBytes(16);
        const newKek = await deriveKek(newPassword, newKekSalt);
        next = {
          ...next,
          kekSalt: toBase64(newKekSalt),
          wrappedDek: await wrapDek(dek, newKek),
          verifierSalt: toBase64(newVerifierSalt),
          verifier: await passwordVerifier(newPassword, newVerifierSalt),
        };
        sessionKeyCache.set(record.slug, dek);
      }
      await users.put(next);
      setUser(toPublic(next));
    },
    [user],
  );

  const exportData = useCallback(async () => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        folder,
        user: user ? { slug: user.slug, displayName: user.displayName, email: user.email, role: user.role } : null,
        settings,
        favorites,
        watchLater,
        history,
      },
      null,
      2,
    );
  }, [favorites, folder, history, settings, user, watchLater]);

  const wipeEverything = useCallback(async () => {
    await wipeVault();
    await resetIndex();
    invalidateLibrary();
    localStorage.removeItem(SESSION_KEY);
    sessionKeyCache.clear();
    window.location.href = "/";
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      user,
      folder,
      settings,
      favorites,
      watchLater,
      history,
      accountCount,
      dir: dirFor(settings.language),
      t: (key: string) => translate(key, settings.language),
      updateSettings,
      resetSettings,
      toggleFavorite,
      toggleFavoriteChannel,
      toggleWatchLater,
      recordWatch,
      clearHistory,
      signUp,
      signIn,
      signOut,
      updateAccount,
      exportData,
      wipeEverything,
    }),
    [
      accountCount,
      clearHistory,
      exportData,
      favorites,
      folder,
      history,
      ready,
      recordWatch,
      resetSettings,
      settings,
      signIn,
      signOut,
      signUp,
      toggleFavorite,
      toggleFavoriteChannel,
      toggleWatchLater,
      updateAccount,
      updateSettings,
      user,
      watchLater,
      wipeEverything,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** In-memory only: the folder key never touches disk or localStorage. */
const sessionKeyCache = new Map<string, CryptoKey>();

function toPublic(record: UserRecord): PublicUser {
  return {
    slug: record.slug,
    displayName: record.displayName,
    email: record.email,
    role: record.role,
    avatarColor: record.avatarColor,
    createdAt: record.createdAt,
  };
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export function useT(): (key: string) => string {
  return useSession().t;
}
