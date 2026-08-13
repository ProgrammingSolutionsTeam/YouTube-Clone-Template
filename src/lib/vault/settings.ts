/** Profile settings model + factory defaults (stored in `<folder>/settings.json`). */

export type Language = "ar" | "en";
export type ThemeMode = "light" | "dark" | "system";

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  defaultSpeed: number;
  rememberPosition: boolean;
  autoplayNext: boolean;
  subtitlesEnabled: boolean;
  subtitleLanguage: string;
  subtitleSize: number;
  subtitleDelay: number;
  seekStep: number;
  theaterByDefault: boolean;
  pipEnabled: boolean;
  loopByDefault: boolean;
  preferredQuality: string;
}

export interface LibrarySettings {
  gridDensity: "compact" | "comfortable" | "spacious";
  showThumbnails: boolean;
  kindFilter: "all" | "video" | "audio";
  sortBy: "recent" | "title" | "size" | "duration";
  hideUnavailable: boolean;
  itemsPerPage: number;
}

export interface PrivacySettings {
  saveHistory: boolean;
  historyLimit: number;
  saveResumePositions: boolean;
  lockOnClose: boolean;
}

export interface ScannerSettings {
  scanOnStartup: boolean;
  deepDetect: boolean;
  generateThumbnails: boolean;
  watchForChanges: boolean;
}

export interface AppSettings {
  version: number;
  language: Language;
  theme: ThemeMode;
  accent: string;
  fontScale: number;
  reduceMotion: boolean;
  library: LibrarySettings;
  player: PlayerSettings;
  privacy: PrivacySettings;
  scanner: ScannerSettings;
  pinnedChannels: string[];
}

export const ACCENTS: { key: string; hsl: string; labelAr: string; labelEn: string }[] = [
  { key: "red", hsl: "0 100% 50%", labelAr: "أحمر يوتيوب", labelEn: "YouTube Red" },
  { key: "crimson", hsl: "348 83% 47%", labelAr: "قرمزي", labelEn: "Crimson" },
  { key: "amber", hsl: "38 92% 50%", labelAr: "عنبري", labelEn: "Amber" },
  { key: "lime", hsl: "84 81% 44%", labelAr: "ليموني", labelEn: "Lime" },
  { key: "emerald", hsl: "160 84% 39%", labelAr: "زمردي", labelEn: "Emerald" },
  { key: "teal", hsl: "184 77% 40%", labelAr: "فيروزي", labelEn: "Teal" },
  { key: "sky", hsl: "199 89% 48%", labelAr: "سماوي", labelEn: "Sky" },
  { key: "indigo", hsl: "243 75% 59%", labelAr: "نيلي", labelEn: "Indigo" },
  { key: "violet", hsl: "271 81% 56%", labelAr: "بنفسجي", labelEn: "Violet" },
  { key: "rose", hsl: "336 80% 58%", labelAr: "وردي", labelEn: "Rose" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  language: "ar",
  theme: "dark",
  accent: "red",
  fontScale: 1,
  reduceMotion: false,
  library: {
    gridDensity: "comfortable",
    showThumbnails: true,
    kindFilter: "all",
    sortBy: "recent",
    hideUnavailable: true,
    itemsPerPage: 60,
  },
  player: {
    volume: 1,
    muted: false,
    defaultSpeed: 1,
    rememberPosition: true,
    autoplayNext: true,
    subtitlesEnabled: true,
    subtitleLanguage: "ar",
    subtitleSize: 100,
    subtitleDelay: 0,
    seekStep: 5,
    theaterByDefault: false,
    pipEnabled: true,
    loopByDefault: false,
    preferredQuality: "auto",
  },
  privacy: {
    saveHistory: true,
    historyLimit: 500,
    saveResumePositions: true,
    lockOnClose: false,
  },
  scanner: {
    scanOnStartup: true,
    deepDetect: false,
    generateThumbnails: true,
    watchForChanges: false,
  },
  pinnedChannels: [],
};

/** Deep-merges stored settings over the defaults so upgrades never break. */
export function mergeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings {
  if (!stored) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    library: { ...DEFAULT_SETTINGS.library, ...(stored.library ?? {}) },
    player: { ...DEFAULT_SETTINGS.player, ...(stored.player ?? {}) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(stored.privacy ?? {}) },
    scanner: { ...DEFAULT_SETTINGS.scanner, ...(stored.scanner ?? {}) },
    pinnedChannels: stored.pinnedChannels ?? [],
  };
}

export interface HistoryEntry {
  id: string;
  title: string;
  rootKey: string;
  segments: string[];
  channel: string;
  at: number;
  position: number;
  duration: number;
  count: number;
}

export interface FavoritesFile {
  items: string[];
  channels: string[];
}

export interface WatchLaterFile {
  items: string[];
}

export interface HistoryFile {
  entries: HistoryEntry[];
}

export const FILES = {
  settings: "settings.json",
  favorites: "favorites.json",
  history: "history.json",
  watchLater: "watch-later.json",
  activity: "activity.json",
} as const;
