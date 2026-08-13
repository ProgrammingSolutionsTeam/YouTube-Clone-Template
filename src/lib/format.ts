import type { Language } from "./vault/settings";

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatSize(bytes?: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatCount(count: number, language: Language): string {
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (count >= 1_000_000) return `${trim(count / 1_000_000)} ${language === "ar" ? "مليون" : "M"}`;
  if (count >= 1000) return `${trim(count / 1000)} ${language === "ar" ? "ألف" : "K"}`;
  return String(count);
}

export function timeAgo(at: number, language: Language): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (language === "en") {
    if (days < 1) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }
  if (days < 1) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
  if (days < 365) return `قبل ${Math.floor(days / 30)} أشهر`;
  return `قبل ${Math.floor(days / 365)} سنوات`;
}
