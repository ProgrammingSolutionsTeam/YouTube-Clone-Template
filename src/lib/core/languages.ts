/**
 * Language detection for sidecar subtitle / audio files.
 * Supports the full ISO-639-1 set plus common 3-letter and full-name variants,
 * so the system is never limited to two languages.
 */

export const LANGUAGES: Record<string, { name: string; native: string; alt: string[] }> = {
  ar: { name: "Arabic", native: "العربية", alt:["ara", "arabic", "arab"] },
  en: { name: "English", native: "English", alt: ["eng", "english", "en-us", "en-gb", "enus", "engb"] },
  fr: { name: "French", native: "Français", alt: ["fre", "fra", "french", "francais"] },
  de: { name: "German", native: "Deutsch", alt: ["ger", "deu", "german", "deutsch"] },
  es: { name: "Spanish", native: "Español", alt: ["spa", "esp", "spanish", "espanol", "es-la"] },
  it: { name: "Italian", native: "Italiano", alt: ["ita", "italian", "italiano"] },
  pt: { name: "Portuguese", native: "Português", alt: ["por", "portuguese", "pt-br", "ptbr", "brazilian"] },
  ru: { name: "Russian", native: "Русский", alt: ["rus", "russian"] },
  tr: { name: "Turkish", native: "Türkçe", alt: ["tur", "turkish", "turkce"] },
  ja: { name: "Japanese", native: "日本語", alt: ["jpn", "jap", "japanese"] },
  ko: { name: "Korean", native: "한국어", alt: ["kor", "korean"] },
  zh: { name: "Chinese", native: "中文", alt: ["chi", "zho", "chinese", "zh-cn", "zh-tw", "chs", "cht", "mandarin"] },
  hi: { name: "Hindi", native: "हिन्दी", alt: ["hin", "hindi"] },
  ur: { name: "Urdu", native: "اردو", alt: ["urd", "urdu"] },
  fa: { name: "Persian", native: "فارسی", alt: ["per", "fas", "persian", "farsi"] },
  he: { name: "Hebrew", native: "עברית", alt: ["heb", "hebrew", "iw"] },
  nl: { name: "Dutch", native: "Nederlands", alt: ["dut", "nld", "dutch", "nederlands"] },
  sv: { name: "Swedish", native: "Svenska", alt: ["swe", "swedish"] },
  no: { name: "Norwegian", native: "Norsk", alt: ["nor", "norwegian", "nb", "nn"] },
  da: { name: "Danish", native: "Dansk", alt: ["dan", "danish"] },
  fi: { name: "Finnish", native: "Suomi", alt: ["fin", "finnish"] },
  pl: { name: "Polish", native: "Polski", alt: ["pol", "polish"] },
  cs: { name: "Czech", native: "Čeština", alt: ["cze", "ces", "czech"] },
  sk: { name: "Slovak", native: "Slovenčina", alt: ["slo", "slk", "slovak"] },
  hu: { name: "Hungarian", native: "Magyar", alt: ["hun", "hungarian"] },
  ro: { name: "Romanian", native: "Română", alt: ["rum", "ron", "romanian"] },
  bg: { name: "Bulgarian", native: "Български", alt: ["bul", "bulgarian"] },
  el: { name: "Greek", native: "Ελληνικά", alt: ["gre", "ell", "greek"] },
  uk: { name: "Ukrainian", native: "Українська", alt: ["ukr", "ukrainian"] },
  id: { name: "Indonesian", native: "Indonesia", alt: ["ind", "indonesian"] },
  ms: { name: "Malay", native: "Melayu", alt: ["may", "msa", "malay"] },
  th: { name: "Thai", native: "ไทย", alt: ["tha", "thai"] },
  vi: { name: "Vietnamese", native: "Tiếng Việt", alt: ["vie", "vietnamese"] },
  hr: { name: "Croatian", native: "Hrvatski", alt: ["hrv", "croatian"] },
  sr: { name: "Serbian", native: "Српски", alt: ["srp", "serbian"] },
  sl: { name: "Slovenian", native: "Slovenščina", alt: ["slv", "slovenian"] },
  et: { name: "Estonian", native: "Eesti", alt: ["est", "estonian"] },
  lv: { name: "Latvian", native: "Latviešu", alt: ["lav", "latvian"] },
  lt: { name: "Lithuanian", native: "Lietuvių", alt: ["lit", "lithuanian"] },
  bn: { name: "Bengali", native: "বাংলা", alt: ["ben", "bengali"] },
  ta: { name: "Tamil", native: "தமிழ்", alt: ["tam", "tamil"] },
  te: { name: "Telugu", native: "తెలుగు", alt: ["tel", "telugu"] },
  ml: { name: "Malayalam", native: "മലയാളം", alt: ["mal", "malayalam"] },
  fil: { name: "Filipino", native: "Filipino", alt: ["tgl", "tagalog", "filipino"] },
  sw: { name: "Swahili", native: "Kiswahili", alt: ["swa", "swahili"] },
  ca: { name: "Catalan", native: "Català", alt: ["cat", "catalan"] },
  eu: { name: "Basque", native: "Euskara", alt: ["baq", "eus", "basque"] },
  gl: { name: "Galician", native: "Galego", alt: ["glg", "galician"] },
  is: { name: "Icelandic", native: "Íslenska", alt: ["ice", "isl", "icelandic"] },
  ga: { name: "Irish", native: "Gaeilge", alt: ["gle", "irish"] },
  sq: { name: "Albanian", native: "Shqip", alt: ["alb", "sqi", "albanian"] },
  mk: { name: "Macedonian", native: "Македонски", alt: ["mac", "mkd", "macedonian"] },
  hy: { name: "Armenian", native: "Հայերեն", alt: ["arm", "hye", "armenian"] },
  ka: { name: "Georgian", native: "ქართული", alt: ["geo", "kat", "georgian"] },
  az: { name: "Azerbaijani", native: "Azərbaycan", alt: ["aze", "azerbaijani"] },
  kk: { name: "Kazakh", native: "Қазақша", alt: ["kaz", "kazakh"] },
  uz: { name: "Uzbek", native: "Oʻzbek", alt: ["uzb", "uzbek"] },
  ne: { name: "Nepali", native: "नेपाली", alt: ["nep", "nepali"] },
  si: { name: "Sinhala", native: "සිංහල", alt: ["sin", "sinhala"] },
  km: { name: "Khmer", native: "ខ្មែរ", alt: ["khm", "khmer"] },
  my: { name: "Burmese", native: "မြန်မာ", alt: ["bur", "mya", "burmese"] },
  mn: { name: "Mongolian", native: "Монгол", alt: ["mon", "mongolian"] },
  af: { name: "Afrikaans", native: "Afrikaans", alt: ["afr", "afrikaans"] },
  am: { name: "Amharic", native: "አማርኛ", alt: ["amh", "amharic"] },
  ku: { name: "Kurdish", native: "Kurdî", alt: ["kur", "kurdish"] },
  ps: { name: "Pashto", native: "پښتو", alt: ["pus", "pashto"] },
  la: { name: "Latin", native: "Latina", alt: ["lat", "latin"] },
};

const LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [code, info] of Object.entries(LANGUAGES)) {
    map[code] = code;
    for (const a of info.alt) map[a] = code;
    map[info.name.toLowerCase()] = code;
    map[info.native.toLowerCase()] = code;
  }
  return map;
})();

export function normalizeLanguage(token: string): string | null {
  const t = token.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (LOOKUP[t]) return LOOKUP[t];
  const short = t.split("-")[0];
  return LOOKUP[short] ?? null;
}

export function languageLabel(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const info = LANGUAGES[code];
  if (!info) return code.toUpperCase();
  return info.native === info.name ? info.name : `${info.native} (${info.name})`;
}

/** Modifier tokens that often sit next to the language code in a filename. */
const MODIFIERS = ["forced", "sdh", "cc", "hi", "default", "full", "hearing", "impaired", "colored", "sign", "songs"];

export interface ParsedSidecar {
  /** the media base name this sidecar belongs to */
  base: string;
  language: string | null;
  /** e.g. "forced", "sdh" */
  modifiers: string[];
  /** raw tokens that could not be classified — used as the display label */
  extra: string[];
}

/**
 * Understands every reasonable naming pattern:
 *   movie-ar.srt · movie.ar.srt · movie_ar.srt · movie.en.forced.vtt
 *   movie - Arabic.srt · movie [ara].ass · movie.2.eng.sdh.srt
 */
export function parseSidecarName(fileBase: string, mediaBases: string[]): ParsedSidecar {
  const cleaned = fileBase.replace(/[[\]()]/g, ".");
  // Longest matching media base wins, so "Lesson 01" beats "Lesson".
  const candidates = mediaBases
    .filter((b) => cleaned.toLowerCase().startsWith(b.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  const base = candidates[0] ?? fileBase;
  const rest = cleaned.slice(base.length);
  const tokens = rest.split(/[.\-_\s]+/).map((t) => t.trim()).filter(Boolean);

  let language: string | null = null;
  const modifiers: string[] = [];
  const extra: string[] = [];
  for (const token of tokens) {
    const lang = normalizeLanguage(token);
    if (lang && !language) {
      language = lang;
      continue;
    }
    if (MODIFIERS.includes(token.toLowerCase())) {
      modifiers.push(token.toLowerCase());
      continue;
    }
    extra.push(token);
  }
  return { base, language, modifiers, extra };
}
