/**
 * One app-wide radio player (a detached <audio>), so a station keeps playing while
 * the user moves between pages. Starting a station pauses every video/audio element
 * on the page, and any video that starts playing pauses the radio — never two at once.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RadioStation } from "@/lib/vault/settings";
import { useSession } from "@/context/SessionProvider";

export type RadioState = "idle" | "loading" | "playing" | "paused" | "error";
export type PlayableStation = Pick<RadioStation, "name" | "url"> & Partial<RadioStation>;

interface RadioValue {
  station: PlayableStation | null;
  state: RadioState;
  volume: number;
  play: (station: PlayableStation) => void;
  toggle: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

const RadioContext = createContext<RadioValue | null>(null);

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used inside RadioProvider");
  return ctx;
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSession();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [station, setStation] = useState<PlayableStation | null>(null);
  const [state, setState] = useState<RadioState>("idle");
  const [volume, setVolumeState] = useState(settings.radio.volume);
  const saveTimer = useRef<number>();

  useEffect(() => setVolumeState(settings.radio.volume), [settings.radio.volume]);

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "none";
      el.addEventListener("playing", () => setState("playing"));
      el.addEventListener("waiting", () => setState((s) => (s === "playing" ? "loading" : s)));
      el.addEventListener("pause", () => setState((s) => (s === "error" ? s : "paused")));
      el.addEventListener("error", () => { if (el.getAttribute("src")) setState("error"); });
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  // A video (or any other media) that starts playing pauses the radio.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const el = audioRef.current;
      if (el && e.target !== el && !el.paused) el.pause();
    };
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);

  const start = useCallback((el: HTMLAudioElement) => {
    document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((m) => { if (!m.paused) m.pause(); });
    setState("loading");
    el.play().catch((err: unknown) => {
      if ((err as DOMException)?.name !== "AbortError") setState("error");
    });
  }, []);

  const play = useCallback((next: PlayableStation) => {
    const el = audio();
    el.volume = volume;
    // Live streams: always reconnect to the live edge instead of resuming a stale buffer.
    el.src = next.url;
    setStation(next);
    start(el);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: next.name,
        artist: "LocalTube Radio",
        artwork: [{ src: "/assets/icons/localtube-512.png", sizes: "512x512", type: "image/png" }],
      });
    }
    if (next.id && next.id !== settings.radio.lastId) void updateSettings({ radio: { lastId: next.id } });
  }, [audio, settings.radio.lastId, start, updateSettings, volume]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !station) return;
    if (el.paused || state === "error") { el.src = station.url; start(el); }
    else el.pause();
  }, [start, state, station]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) { el.pause(); el.removeAttribute("src"); el.load(); }
    setStation(null);
    setState("idle");
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void updateSettings({ radio: { volume: v } }), 500);
  }, [updateSettings]);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const value = useMemo(() => ({ station, state, volume, play, toggle, stop, setVolume }), [station, state, volume, play, toggle, stop, setVolume]);
  return <RadioContext.Provider value={value}>{children}</RadioContext.Provider>;
}
