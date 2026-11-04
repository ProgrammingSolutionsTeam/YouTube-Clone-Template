import { describe, expect, it } from "vitest";
import { addStation, blockedByHttps, normalizeStationUrl, SUGGESTED_STATIONS } from "./stations";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/vault/settings";

describe("radio links", () => {
  it("adds https:// when the scheme is missing", () => {
    expect(normalizeStationUrl("  stream.example.com/live.mp3 ")).toEqual({ ok: true, url: "https://stream.example.com/live.mp3" });
  });
  it("rejects empty and non-http links", () => {
    expect(normalizeStationUrl("")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeStationUrl("ftp://x.com/a.mp3")).toEqual({ ok: false, reason: "protocol" });
  });
  it("does not add the same stream twice", () => {
    const one = addStation([], { name: "A", url: "https://a.com/live" }, "1", 1);
    expect(addStation(one, { name: "B", url: "https://a.com/live/" }, "2", 2)).toHaveLength(1);
  });
  it("flags http streams inside an https page", () => {
    expect(blockedByHttps("http://a.com/s", "https:")).toBe(true);
    expect(blockedByHttps("http://a.com/s", "http:")).toBe(false);
  });
  it("suggests Arabic, news, music and Quran stations, all over https", () => {
    for (const c of ["arabic", "news", "music", "quran"]) expect(SUGGESTED_STATIONS.some((s) => s.category === c)).toBe(true);
    expect(SUGGESTED_STATIONS.every((s) => s.url.startsWith("https://"))).toBe(true);
  });
});

describe("defaults", () => {
  it("uses English as the default language", () => {
    expect(DEFAULT_SETTINGS.language).toBe("en");
    expect(mergeSettings(null).language).toBe("en");
  });
  it("keeps saved radio stations when settings load", () => {
    const st = { id: "1", name: "A", url: "https://a.com", addedAt: 1 };
    expect(mergeSettings({ radio: { stations: [st], volume: 0.5 } }).radio.stations).toEqual([st]);
  });
});
