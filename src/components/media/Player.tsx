/**
 * Local media player.
 *
 * Streams the on-disk file lazily through an object URL (range reads from disk),
 * converts any sidecar subtitle to WebVTT on the fly, remembers the resume
 * position in the encrypted profile folder, and falls back to an on-device
 * FFmpeg (WASM) pipeline for legacy containers the browser cannot decode
 * (rm, rmvb, wmv, avi, vob, flv, ape, wma …).
 *
 * The chrome is fully custom (YouTube-like): scrubber with buffered range and
 * hover preview, prev/next, volume, captions, quality, speed, loop, PiP,
 * theater, fullscreen and the usual keyboard shortcuts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  Gauge,
  Heart,
  Link2,
  Loader2,
  Maximize,
  Minimize,
  Music2,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
  Clock,
  RectangleHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import type { MediaItem } from "@/lib/core/types";
import { locationOf } from "@/lib/media/library";
import { watchHref } from "@/lib/core/paths";
import { downloadMedia, openPlayback, openSubtitle, probeItem, saveProbe } from "@/lib/media/mediaService";
import { openFallback, releaseEngine, type TranscodeStatus } from "@/lib/media/transcoder";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

type Source = {
  url: string;
  mimeType: string;
  /** true when the file plays natively; false when it came from the converter */
  native: boolean;
  seek?: (time: number) => void;
};

export function Player({
  item,
  onEnded,
  theater,
  onTheaterToggle,
  onNext,
  onPrevious,
}: {
  item: MediaItem;
  onEnded?: () => void;
  theater: boolean;
  onTheaterToggle: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const { settings, favorites, watchLater, toggleFavorite, toggleWatchLater, recordWatch, updateSettings, t } =
    useSession();
  const { toast } = useToast();

  const shellRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);

  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<TranscodeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(settings.player.defaultSpeed);
  const [loop, setLoop] = useState(settings.player.loopByDefault);
  const [subtitleId, setSubtitleId] = useState<string>("off");
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [qualityId, setQualityId] = useState<string>("original");

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(item.duration ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(settings.player.volume);
  const [muted, setMuted] = useState(settings.player.muted);
  const [fullscreen, setFullscreen] = useState(false);
  const [pip, setPip] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [hover, setHover] = useState<{ time: number; x: number } | null>(null);
  const [flash, setFlash] = useState<{ dir: "back" | "forward"; key: number } | null>(null);

  const isAudio = item.kind === "audio";
  const isFavorite = favorites.items.includes(item.id);
  const isLater = watchLater.items.includes(item.id);
  const seekStep = settings.player.seekStep || 10;
  const location = useMemo(() => locationOf(item), [item]);

  /* ---------------------------------------------------------------- source */
  useEffect(() => {
    let release: (() => void) | null = null;
    let alive = true;
    setSource(null);
    setError(null);
    setStatus(null);
    setTime(0);
    setBuffered(0);
    setDuration(item.duration ?? 0);

    (async () => {
      const opened = await openPlayback(item, qualityId === "original" ? undefined : qualityId);
      if (!alive) return opened.release();

      if (opened.directPlay) {
        release = opened.release;
        setSource({ url: opened.url, mimeType: opened.mimeType, native: true });
        return;
      }

      // legacy container: convert on device
      opened.release();
      const stored = window.sessionStorage.getItem(`resume:${item.id}`);
      const session = await openFallback({
        file: await fetchFileFor(item, qualityId),
        kind: isAudio ? "audio" : "video",
        duration: item.duration,
        startAt: settings.player.rememberPosition && stored ? Number(stored) : 0,
        onStatus: (next) => alive && setStatus(next.stage === "ready" ? null : next),
        getPlayhead: () => mediaRef.current?.currentTime ?? 0,
      });
      if (!alive) return session.destroy();
      release = session.destroy;
      setSource({ url: session.url, mimeType: "video/mp4", native: false, seek: session.seek });
    })().catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : "unreadable");
    });

    return () => {
      alive = false;
      const media = mediaRef.current;
      if (media) {
        media.pause();
        if (document.pictureInPictureElement === media) void document.exitPictureInPicture().catch(() => undefined);
        media.removeAttribute("src");
        media.load();
      }
      release?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, qualityId]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      const media = mediaRef.current;
      if (media) {
        media.pause();
        if (document.pictureInPictureElement === media) void document.exitPictureInPicture().catch(() => undefined);
        media.removeAttribute("src");
        media.load();
      }
      void releaseEngine();
    },
    [],
  );

  /* ------------------------------------------------------------- subtitles */
  useEffect(() => {
    let release: (() => void) | null = null;
    let alive = true;
    setSubtitleUrl(null);
    if (subtitleId === "off") return;
    (async () => {
      const opened = await openSubtitle(item, subtitleId, { delay: settings.player.subtitleDelay });
      if (!alive) return opened.release();
      release = opened.release;
      setSubtitleUrl(opened.url);
    })().catch(() => undefined);
    return () => {
      alive = false;
      release?.();
    };
  }, [item, subtitleId, settings.player.subtitleDelay]);

  useEffect(() => {
    if (!settings.player.subtitlesEnabled || !item.subtitles.length) {
      setSubtitleId("off");
      return;
    }
    const preferred =
      item.subtitles.find((s) => s.language === settings.player.subtitleLanguage) ?? item.subtitles[0];
    setSubtitleId(preferred.id);
  }, [item, settings.player.subtitleLanguage, settings.player.subtitlesEnabled]);

  /* ------------------------------------------------- element sync + probe */
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = volume;
    media.muted = muted;
    media.playbackRate = speed;
    media.loop = loop;
  }, [loop, muted, source, speed, volume]);

  useEffect(() => {
    if (item.probed) return;
    let alive = true;
    (async () => {
      const probe = await probeItem(item, { thumbnail: settings.scanner.generateThumbnails });
      if (alive && !probe.error) await saveProbe(item, probe);
    })();
    return () => {
      alive = false;
    };
  }, [item, settings.scanner.generateThumbnails]);

  /* --------------------------------------------------- history + resume */
  const resumeApplied = useRef(false);

  const save = useCallback(
    (position: number, total: number) => {
      void recordWatch({
        id: item.id,
        title: item.title,
        rootKey: location.rootKey,
        segments: location.segments,
        channel: item.channel,
        at: Date.now(),
        position,
        duration: total,
      });
    },
    [item, location.rootKey, location.segments, recordWatch],
  );

  const onLoaded = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = speed;
    if (Number.isFinite(media.duration) && media.duration > 0) setDuration(media.duration);
    if (!resumeApplied.current && settings.player.rememberPosition && source?.native) {
      resumeApplied.current = true;
      const stored = window.sessionStorage.getItem(`resume:${item.id}`);
      const position = stored ? Number(stored) : 0;
      if (position > 5 && position < media.duration - 10) media.currentTime = position;
    }
    save(media.currentTime, media.duration || item.duration || 0);
  };

  const onTimeUpdate = () => {
    const media = mediaRef.current;
    if (!media) return;
    setTime(media.currentTime);
    if (media.buffered.length) setBuffered(media.buffered.end(media.buffered.length - 1));
    if (settings.player.rememberPosition) {
      window.sessionStorage.setItem(`resume:${item.id}`, String(Math.floor(media.currentTime)));
    }
  };

  useEffect(() => {
    resumeApplied.current = false;
    return () => {
      const media = mediaRef.current;
      if (media && media.currentTime > 3) save(media.currentTime, media.duration || 0);
    };
  }, [item.id, save]);

  /* ------------------------------------------------------------- controls */
  const showChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (mediaRef.current && !mediaRef.current.paused) setChromeVisible(false);
    }, 2800);
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const entered = () => setPip(true);
    const left = () => setPip(false);
    media.addEventListener("enterpictureinpicture", entered);
    media.addEventListener("leavepictureinpicture", left);
    return () => {
      media.removeEventListener("enterpictureinpicture", entered);
      media.removeEventListener("leavepictureinpicture", left);
    };
  }, [source]);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) void media.play().catch(() => undefined);
    else media.pause();
    showChrome();
  }, [showChrome]);

  const seekTo = useCallback(
    (target: number) => {
      const media = mediaRef.current;
      if (!media) return;
      const total = duration || media.duration || 0;
      const next = Math.min(Math.max(0, target), total ? total - 0.25 : target);
      source?.seek?.(next);
      try {
        media.currentTime = next;
      } catch {
        /* not seekable yet */
      }
      setTime(next);
      showChrome();
    },
    [duration, showChrome, source],
  );

  const nudge = useCallback(
    (delta: number) => {
      seekTo((mediaRef.current?.currentTime ?? 0) + delta);
      setFlash({ dir: delta < 0 ? "back" : "forward", key: Date.now() });
      window.setTimeout(() => setFlash(null), 500);
    },
    [seekTo],
  );

  const applyVolume = (value: number) => {
    setVolume(value);
    setMuted(value === 0);
    void updateSettings({ player: { volume: value, muted: value === 0 } });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    void updateSettings({ player: { muted: next } });
  };

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      /* denied */
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePip = async () => {
    const media = mediaRef.current;
    if (!media) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await media.requestPictureInPicture();
    } catch {
      toast({ title: t("player.pip"), variant: "destructive" });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${watchHref(location)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("watch.copied"), description: url });
    } catch {
      toast({ title: url });
    }
  };

  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (mediaRef.current) mediaRef.current.playbackRate = value;
  };

  /* -------------------------------------------------------- keyboard keys */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      const handled = () => {
        event.preventDefault();
        showChrome();
      };
      if (key === " " || key === "k") return handled(), togglePlay();
      if (key === "arrowright" || key === "l") return handled(), nudge(key === "l" ? 10 : seekStep);
      if (key === "arrowleft" || key === "j") return handled(), nudge(key === "j" ? -10 : -seekStep);
      if (key === "arrowup") return handled(), applyVolume(Math.min(1, Number((volume + 0.05).toFixed(2))));
      if (key === "arrowdown") return handled(), applyVolume(Math.max(0, Number((volume - 0.05).toFixed(2))));
      if (key === "m") return handled(), toggleMute();
      if (key === "f") return handled(), void toggleFullscreen();
      if (key === "t") return handled(), onTheaterToggle();
      if (key === "i") return handled(), void togglePip();
      if (key === "c") {
        handled();
        if (item.subtitles.length) setSubtitleId((current) => (current === "off" ? item.subtitles[0].id : "off"));
        return;
      }
      if (key === "n" && event.shiftKey) return handled(), onNext?.();
      if (key === "p" && event.shiftKey) return handled(), onPrevious?.();
      if (/^[0-9]$/.test(key) && duration) return handled(), seekTo((duration * Number(key)) / 10);
      if (key === ">") return handled(), changeSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + 1)] ?? speed);
      if (key === "<") return handled(), changeSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(speed) - 1)] ?? speed);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, item.subtitles, nudge, onNext, onPrevious, onTheaterToggle, seekStep, showChrome, speed, togglePlay, volume]);

  /* --------------------------------------------------------- hover preview */
  const previewSrc = source?.native && !isAudio ? source.url : null;

  const paintPreview = (seconds: number) => {
    const video = previewRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || !previewSrc) return;
    video.currentTime = seconds;
    video.onseeked = () => {
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = 160;
      canvas.height = Math.round((160 * (video.videoHeight || 90)) / (video.videoWidth || 160));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    };
  };

  const pointToTime = (clientX: number) => {
    const bar = barRef.current;
    if (!bar || !duration) return null;
    const rect = bar.getBoundingClientRect();
    const rtl = getComputedStyle(bar).direction === "rtl";
    const raw = (clientX - rect.left) / rect.width;
    const ratio = Math.min(1, Math.max(0, rtl ? 1 - raw : raw));
    return { time: ratio * duration, x: Math.min(rect.width - 12, Math.max(12, clientX - rect.left)) };
  };

  const onBarMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointToTime(event.clientX);
    if (!point) return;
    setHover(point);
    paintPreview(point.time);
  };

  const scrubbing = useRef(false);

  const onBarDown = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    const point = pointToTime(event.clientX);
    if (point) seekTo(point.time);
  };

  const onBarUp = () => {
    scrubbing.current = false;
  };

  const onBarDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    onBarMove(event);
    if (!scrubbing.current) return;
    const point = pointToTime(event.clientX);
    if (point) seekTo(point.time);
  };

  /* ---------------------------------------------- surface tap / dbl-click */
  const onSurfaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (ratio < 0.35) nudge(-seekStep);
      else if (ratio > 0.65) nudge(seekStep);
      else void toggleFullscreen();
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      togglePlay();
    }, 220);
  };

  const progress = duration ? (time / duration) * 100 : 0;
  const bufferedPercent = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const converting = status && status.stage !== "ready";

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="w-full">
      <div
        ref={shellRef}
        onPointerMove={showChrome}
        onPointerLeave={() => playing && setChromeVisible(false)}
        className={cn(
          "group relative w-full overflow-hidden bg-black sm:rounded-xl",
          fullscreen ? "h-screen" : theater ? "aspect-[21/9] max-h-[80vh]" : "aspect-video",
          !chromeVisible && "cursor-none",
        )}
      >
        {error ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-sm text-white/85">{t("player.unsupported")}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void downloadMedia(item)}>
                <Download className="me-2 h-4 w-4" />
                {t("player.download")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {source ? (
              <video
                ref={mediaRef}
                key={source.url}
                src={source.url}
                 autoPlay
                playsInline
                preload="auto"
                onLoadedMetadata={onLoaded}
                onTimeUpdate={onTimeUpdate}
                onProgress={onTimeUpdate}
                onDurationChange={onLoaded}
                onPlay={() => {
                  setPlaying(true);
                  showChrome();
                }}
                onPause={() => {
                  setPlaying(false);
                  setChromeVisible(true);
                }}
                onWaiting={() => setWaiting(true)}
                onPlaying={() => setWaiting(false)}
                onSeeking={() => source.seek?.(mediaRef.current?.currentTime ?? 0)}
                onEnded={() => {
                  setPlaying(false);
                  if (settings.player.autoplayNext) onEnded?.();
                }}
                className={cn("h-full w-full bg-black", isAudio && "opacity-0")}
                style={{ objectFit: "contain" }}
              >
                {subtitleUrl && (
                  <track
                    key={subtitleUrl}
                    kind="subtitles"
                    src={subtitleUrl}
                    default
                    label={item.subtitles.find((s) => s.id === subtitleId)?.label ?? "VTT"}
                  />
                )}
              </video>
            ) : null}

            {isAudio && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-3 text-white/80">
                  <Music2 className={cn("h-16 w-16", playing && "animate-pulse")} />
                  <p className="max-w-[80%] truncate text-sm">{item.title}</p>
                </div>
              </div>
            )}

            {/* click / double-click surface */}
            <div className="absolute inset-0" onClick={onSurfaceClick} />

            {(waiting || (!source && !error) || converting) && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="h-9 w-9 animate-spin" />
                  {converting && (
                    <p className="text-xs">
                      {status?.stage === "loading"
                        ? t("player.preparing")
                        : status?.stage === "remuxing"
                          ? t("player.remuxing")
                          : t("player.converting")}
                      {typeof status?.progress === "number" ? ` ${Math.round(status.progress * 100)}%` : ""}
                    </p>
                  )}
                  {converting && <p className="max-w-[70%] text-center text-[11px] text-white/70">{t("player.convertNotice")}</p>}
                </div>
              </div>
            )}

            {flash && (
              <div
                key={flash.key}
                className={cn(
                  "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white",
                  flash.dir === "back" ? "left-8" : "right-8",
                )}
              >
                {flash.dir === "back" ? <SkipBack className="h-6 w-6" /> : <SkipForward className="h-6 w-6" />}
              </div>
            )}

            {!playing && source && !converting && !waiting && (
              <button
                onClick={togglePlay}
                aria-label={t("player.play")}
                className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:scale-105 hover:bg-black/70"
              >
                <Play className="ms-0.5 h-7 w-7 fill-current" />
              </button>
            )}

            {/* ------------------------------------------------ control bar */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-1.5 pt-8 transition-opacity duration-200 sm:px-3",
                chromeVisible ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {/* scrubber */}
              <div
                ref={barRef}
                onPointerDown={onBarDown}
                onPointerMove={onBarDrag}
                onPointerUp={onBarUp}
                onPointerLeave={() => {
                  setHover(null);
                  scrubbing.current = false;
                }}
                className="group/bar relative mx-1 cursor-pointer py-2.5"
                role="slider"
                aria-label={t("player.seek")}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(time)}
                tabIndex={0}
              >
                <div className="relative h-1 w-full rounded-full bg-white/25 transition-[height] group-hover/bar:h-1.5">
                  <div className="absolute inset-y-0 start-0 rounded-full bg-white/35" style={{ width: `${bufferedPercent}%` }} />
                  <div className="absolute inset-y-0 start-0 rounded-full bg-youtube-red" style={{ width: `${progress}%` }}>
                    <span className="absolute -end-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 scale-0 rounded-full bg-youtube-red transition-transform group-hover/bar:scale-100" />
                  </div>
                </div>

                {hover && (
                  <div
                    className="pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 rounded-md bg-black/85 p-1 text-center"
                    style={{ left: hover.x }}
                  >
                    {previewSrc && <canvas ref={previewCanvasRef} className="mb-1 h-[90px] w-[160px] rounded" />}
                    <span className="px-1 text-[11px] font-medium text-white" dir="ltr">
                      {formatDuration(hover.time)}
                    </span>
                  </div>
                )}
              </div>

              {/* buttons */}
              <div className="flex items-center gap-0.5 text-white sm:gap-1">
                <IconButton label={playing ? t("player.pause") : t("player.play")} onClick={togglePlay}>
                  {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                </IconButton>
                {onPrevious && (
                  <IconButton label={t("player.previous")} onClick={onPrevious} className="hidden sm:inline-flex">
                    <SkipBack className="h-5 w-5 fill-current rtl:rotate-180" />
                  </IconButton>
                )}
                {onNext && (
                  <IconButton label={t("player.next")} onClick={onNext}>
                    <SkipForward className="h-5 w-5 fill-current rtl:rotate-180" />
                  </IconButton>
                )}

                <div className="group/vol flex items-center">
                  <IconButton label={muted ? t("player.unmute") : t("player.mute")} onClick={toggleMute}>
                    <VolumeIcon className="h-5 w-5" />
                  </IconButton>
                  <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol:w-20 focus-within:w-20">
                    <Slider
                      value={[muted ? 0 : Math.round(volume * 100)]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => applyVolume(value / 100)}
                      className="mx-2 w-16"
                      aria-label={t("player.volume")}
                    />
                  </div>
                </div>

                <span className="ms-1 select-none text-[11px] font-medium tabular-nums sm:text-xs" dir="ltr">
                  {formatDuration(time)} / {formatDuration(duration || item.duration)}
                </span>

                <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
                  {item.subtitles.length > 0 && (
                    <IconButton
                      label={t("player.subtitles")}
                      onClick={() => setSubtitleId((c) => (c === "off" ? item.subtitles[0].id : "off"))}
                      className={cn(subtitleId !== "off" && "after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:bg-youtube-red")}
                    >
                      <Subtitles className="h-5 w-5" />
                    </IconButton>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label={t("player.settings")}
                        className="relative grid h-9 w-9 place-items-center rounded-full text-white/95 transition hover:bg-white/15"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-56">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Gauge className="me-2 h-4 w-4" />
                          {t("player.speed")}
                          <span className="ms-auto text-xs text-muted-foreground" dir="ltr">
                            {speed}×
                          </span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {SPEEDS.map((value) => (
                            <DropdownMenuItem key={value} onClick={() => changeSpeed(value)}>
                              <span dir="ltr">{value === 1 ? t("player.normal") : `${value}×`}</span>
                              {speed === value && <Check className="ms-auto h-4 w-4" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {item.qualities.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>{t("player.quality")}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setQualityId("original")}>
                              {t("player.original")}
                              {qualityId === "original" && <Check className="ms-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            {item.qualities.map((quality) => (
                              <DropdownMenuItem key={quality.id} onClick={() => setQualityId(quality.id)}>
                                <span dir="ltr">{quality.label}</span>
                                {qualityId === quality.id && <Check className="ms-auto h-4 w-4" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}

                      {item.subtitles.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Subtitles className="me-2 h-4 w-4" />
                            {t("player.subtitles")}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setSubtitleId("off")}>
                              {t("player.off")}
                              {subtitleId === "off" && <Check className="ms-auto h-4 w-4" />}
                            </DropdownMenuItem>
                            {item.subtitles.map((track) => (
                              <DropdownMenuItem key={track.id} onClick={() => setSubtitleId(track.id)}>
                                {track.label}
                                {subtitleId === track.id && <Check className="ms-auto h-4 w-4" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}

                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLoop((v) => !v)}>
                        <Repeat className="me-2 h-4 w-4" />
                        {t("player.loop")}
                        {loop && <Check className="ms-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void toggleFavorite(item.id)}>
                        <Heart className={cn("me-2 h-4 w-4", isFavorite && "fill-current text-youtube-red")} />
                        {isFavorite ? t("player.unfavorite") : t("player.favorite")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void toggleWatchLater(item.id)}>
                        <Clock className="me-2 h-4 w-4" />
                        {t("player.watchLater")}
                        {isLater && <Check className="ms-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void share()}>
                        <Link2 className="me-2 h-4 w-4" />
                        {t("watch.share")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void downloadMedia(item)}>
                        <Download className="me-2 h-4 w-4" />
                        {t("player.download")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                        {t("player.shortcuts")}
                      </DropdownMenuLabel>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {settings.player.pipEnabled && !isAudio && (
                    <IconButton label={t("player.pip")} onClick={() => void togglePip()} className="hidden sm:inline-flex">
                      <PictureInPicture2 className={cn("h-5 w-5", pip && "text-youtube-red")} />
                    </IconButton>
                  )}
                  <IconButton
                    label={t("player.theater")}
                    onClick={onTheaterToggle}
                    className="hidden lg:inline-flex"
                  >
                    <RectangleHorizontal className={cn("h-5 w-5", theater && "text-youtube-red")} />
                  </IconButton>
                  <IconButton label={t("player.fullscreen")} onClick={() => void toggleFullscreen()}>
                    {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </IconButton>
                </div>
              </div>
            </div>
          </>
        )}

        {/* hidden element used to paint scrubber previews */}
        {previewSrc && (
          <video ref={previewRef} src={previewSrc} muted preload="metadata" className="hidden" playsInline />
        )}
      </div>

      {/* quick actions under the player (mobile friendly) */}
      <div className="mt-3 flex items-center gap-2 px-3 sm:px-0 lg:hidden">
        <Button
          variant={isFavorite ? "default" : "secondary"}
          size="sm"
          className={cn("rounded-full", isFavorite && "bg-youtube-red hover:bg-youtube-red/90")}
          onClick={() => void toggleFavorite(item.id)}
        >
          <Heart className={cn("me-1.5 h-4 w-4", isFavorite && "fill-current")} />
          {isFavorite ? t("player.unfavorite") : t("player.favorite")}
        </Button>
        <Button variant="secondary" size="sm" className="rounded-full" onClick={() => void toggleWatchLater(item.id)}>
          <Clock className="me-1.5 h-4 w-4" />
          {t("player.watchLater")}
        </Button>
        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full" onClick={() => void share()} aria-label={t("watch.share")}>
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => void downloadMedia(item)}
          aria-label={t("player.download")}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/95 transition hover:bg-white/15",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Re-opens the raw File for the converter without exposing any real path. */
async function fetchFileFor(item: MediaItem, qualityId: string): Promise<File> {
  const opened = await openPlayback(item, qualityId === "original" ? undefined : qualityId);
  const response = await fetch(opened.url);
  const blob = await response.blob();
  opened.release();
  return new File([blob], opened.fileName, { type: opened.mimeType });
}
