/**
 * Radio: link validation + the built-in suggestion list.
 * The list ships with the app (no directory lookups at runtime); a stream is only
 * contacted when the user presses play. Every link below was checked to stream audio.
 */
import type { RadioStation } from "@/lib/vault/settings";

export type RadioCategory = "arabic" | "quran" | "news" | "music" | "world";

export interface SuggestedStation {
  name: string;
  url: string;
  category: RadioCategory;
  country: string;
  tags: string;
}

export const RADIO_CATEGORIES: { key: RadioCategory; ar: string; en: string }[] = [
  { key: "arabic", ar: "عربية", en: "Arabic" },
  { key: "news", ar: "أخبار", en: "News" },
  { key: "music", ar: "أغاني وموسيقى", en: "Music" },
  { key: "quran", ar: "قرآن كريم", en: "Quran" },
  { key: "world", ar: "عالمية", en: "World" },
];

export const SUGGESTED_STATIONS: SuggestedStation[] = [
  // Arabic news
  { name: "Monte Carlo Doualiya", url: "https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3", category: "news", country: "FR", tags: "عربي · أخبار" },
  { name: "BBC Arabic Radio", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio", category: "news", country: "GB", tags: "عربي · أخبار" },
  { name: "Sky News Arabia Radio", url: "https://radio.skynewsarabia.com/stream/radio/skynewsarabia", category: "news", country: "AE", tags: "عربي · أخبار" },
  { name: "Replay News Arabic", url: "https://replaynewsar.ice.infomaniak.ch/replaynewsar-128.mp3", category: "news", country: "SA", tags: "عربي · أخبار" },
  { name: "Shafaq Radio", url: "https://radio.shafaq.com/radio", category: "news", country: "IQ", tags: "عربي · العراق" },
  // World news
  { name: "BBC World Service", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service", category: "news", country: "GB", tags: "English · News" },
  { name: "NPR News", url: "https://npr-ice.streamguys1.com/live.mp3", category: "news", country: "US", tags: "English · News" },
  { name: "CNN", url: "https://tunein.cdnstream1.com/2868_96.mp3", category: "news", country: "US", tags: "English · News" },
  { name: "LBC", url: "https://media-ssl.musicradio.com/LBCUK", category: "news", country: "GB", tags: "English · Talk" },
  { name: "France Info", url: "https://icecast.radiofrance.fr/franceinfo-midfi.mp3", category: "news", country: "FR", tags: "Français · Info" },
  { name: "RFI Monde", url: "https://rfimonde64k.ice.infomaniak.ch/rfimonde-64.mp3", category: "news", country: "FR", tags: "Français · Info" },
  { name: "Europe 1", url: "https://stream.europe1.fr/europe1.aac", category: "news", country: "FR", tags: "Français · Talk" },
  { name: "Deutschlandfunk", url: "https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3", category: "news", country: "DE", tags: "Deutsch · News" },
  // Arabic music
  { name: "Sawt El Ghad", url: "https://l3.itworkscdn.net/itwaudio/9030/stream/", category: "arabic", country: "LB", tags: "لبنان · أغاني" },
  { name: "Voice of Lebanon", url: "https://l3.itworkscdn.net/itwaudio/9054/stream", category: "arabic", country: "LB", tags: "لبنان · منوعات" },
  { name: "Fame FM Lebanon", url: "https://l3.itworkscdn.net/itwaudio/9044/stream", category: "arabic", country: "LB", tags: "لبنان · أغاني" },
  { name: "Virgin Radio Lebanon", url: "https://stream.zeno.fm/dwxw3p9vea0uv", category: "arabic", country: "LB", tags: "Hits" },
  { name: "Fairuz — فيروز", url: "https://stream.zeno.fm/9vrahqqfuuhvv", category: "arabic", country: "LB", tags: "طرب · فيروز" },
  { name: "Rahbaniyat — رحبانيات", url: "https://stream.zeno.fm/4g8xck48kfhvv", category: "arabic", country: "LB", tags: "طرب · الرحابنة" },
  { name: "Radio Hits 88.2 Cairo", url: "https://radiohits882.radioca.st/;", category: "arabic", country: "EG", tags: "مصر · أغاني" },
  { name: "Mix FM 87.8", url: "https://stream-29.zeno.fm/na3vpvn10qruv", category: "arabic", country: "EG", tags: "مصر · أغاني" },
  { name: "Radio 9090", url: "https://9090streaming.mobtada.com/9090FMEGYPT", category: "arabic", country: "EG", tags: "مصر · منوعات" },
  { name: "Amr Diab Radio", url: "https://stream-40.zeno.fm/xa4yhh4k838uv", category: "arabic", country: "EG", tags: "عمرو دياب" },
  { name: "Sumer FM", url: "https://l3.itworkscdn.net/itwaudio/9012/stream", category: "arabic", country: "IQ", tags: "العراق · أغاني" },
  { name: "Al Rasheed FM", url: "https://streaming.shoutcast.com/alrasheed-fm", category: "arabic", country: "IQ", tags: "العراق · منوعات" },
  // Quran
  { name: "إذاعة القرآن الكريم — القاهرة", url: "https://stream.radiojar.com/8s5u5tpdtwzuv", category: "quran", country: "EG", tags: "قرآن كريم" },
  { name: "Mp3Quran — منوعة", url: "https://qurango.net/radio/mix", category: "quran", country: "SA", tags: "قرآن كريم" },
  { name: "مشاري العفاسي", url: "https://qurango.net/radio/mishary_alafasi", category: "quran", country: "KW", tags: "قرآن كريم" },
  { name: "ياسر الدوسري", url: "https://qurango.net/radio/yasser_aldosari", category: "quran", country: "SA", tags: "قرآن كريم" },
  { name: "تراتيل قصيرة", url: "https://qurango.net/radio/tarateel", category: "quran", country: "SA", tags: "قرآن كريم" },
  { name: "محمود خليل الحصري", url: "https://qurango.net/radio/mahmoud_khalil_alhussary_warsh", category: "quran", country: "EG", tags: "قرآن كريم" },
  // World music
  { name: "Heart 80s", url: "https://media-ssl.musicradio.com/Heart80sMP3", category: "music", country: "GB", tags: "80s · Pop" },
  { name: "Heart London", url: "https://media-ssl.musicradio.com/HeartLondonMP3", category: "music", country: "GB", tags: "Pop · Hits" },
  { name: "Capital Dance", url: "https://icecast.thisisdax.com/CapitalDanceMP3", category: "music", country: "GB", tags: "Dance" },
  { name: "Smooth Chill", url: "https://media-ssl.musicradio.com/ChillMP3", category: "music", country: "GB", tags: "Chill" },
  { name: "Classic FM", url: "https://media-ssl.musicradio.com/ClassicFMMP3", category: "music", country: "GB", tags: "Classical" },
  { name: "Radio Paradise", url: "https://stream.radioparadise.com/aac-320", category: "music", country: "US", tags: "Eclectic · HQ" },
  { name: "KEXP 90.3", url: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", category: "music", country: "US", tags: "Indie · Rock" },
  { name: "SmoothJazz.com", url: "https://smoothjazz.cdnstream1.com/2585_128.mp3", category: "music", country: "US", tags: "Smooth jazz" },
  { name: "Exclusively Queen", url: "https://streaming.exclusive.radio/er/queen/icecast.audio", category: "music", country: "AE", tags: "Rock" },
  { name: "Exclusively Pink Floyd", url: "https://streaming.exclusive.radio/er/pinkfloyd/icecast.audio", category: "music", country: "AE", tags: "Classic rock" },
  // World
  { name: "FIP", url: "https://icecast.radiofrance.fr/fip-midfi.mp3", category: "world", country: "FR", tags: "Eclectic" },
  { name: "OUI FM", url: "https://ouifm.ice.infomaniak.ch/ouifm-high.mp3", category: "world", country: "FR", tags: "Rock" },
  { name: "SWR3", url: "https://liveradio.swr.de/sw282p3/swr3/play.mp3", category: "world", country: "DE", tags: "Pop · Rock" },
  { name: "Radio Swiss Jazz", url: "https://stream.srg-ssr.ch/m/rsj/mp3_128", category: "world", country: "CH", tags: "Jazz" },
  { name: "Radio Swiss Classic", url: "https://stream.srg-ssr.ch/m/rsc_de/mp3_128", category: "world", country: "CH", tags: "Classical" },
];

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: "empty" | "invalid" | "protocol" };

/** Accepts http(s) stream links only; trims spaces and adds https:// when the scheme is missing. */
export function normalizeStationUrl(input: string): UrlCheck {
  let raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, reason: "protocol" };
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return { ok: false, reason: "invalid" };
  return { ok: true, url: parsed.toString() };
}

/** An http:// stream cannot play inside an https:// page (browsers block mixed content). */
export function blockedByHttps(url: string, pageProtocol: string): boolean {
  return pageProtocol === "https:" && url.startsWith("http://");
}

export const sameStream = (a: string, b: string) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

export function addStation(list: RadioStation[], station: Omit<RadioStation, "id" | "addedAt">, id: string, now = Date.now()): RadioStation[] {
  if (list.some((s) => sameStream(s.url, station.url))) return list;
  return [...list, { ...station, name: station.name.trim().slice(0, 80) || "Radio", id, addedAt: now }];
}

export const flag = (cc: string) =>
  cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "📻";
