/**
 * Scrolling — a Shorts/Reels style vertical feed of short clips.
 *
 * Kept light on purpose: only the active slide and its neighbours mount a
 * <video>; every other slide is an empty, fixed-height placeholder. The feed is
 * shuffled on every visit (recently seen clips go last).
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Expand,
  Heart,
  Loader2,
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Gauge,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyLibrary } from "@/components/media/MediaGrid";
import { ShareDialog } from "@/components/media/ShareDialog";
import { useSession } from "@/context/SessionProvider";
import { usePlayer } from "@/context/PlayerProvider";
import { shortsFeed, markSeen } from "@/lib/media/shorts";
import { openPlayback, thumbnailUrl } from "@/lib/media/mediaService";
import { applyAudio } from "@/lib/media/audioEngine";
import { locationOf } from "@/lib/media/library";
import { watchHref } from "@/lib/core/paths";
import type { MediaItem } from "@/lib/core/types";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

const Shorts = () => {
  const { t, settings, updateSettings } = useSession();
  const { stop } = usePlayer();
  const s = settings.shorts;
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(s.startMuted);
  const [speed, setSpeed] = useState(s.speed);
  const [seed, setSeed] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // the feed owns playback: close the app-wide player when it opens
  useEffect(() => stop(), [stop]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    shortsFeed(s)
      .then((rows) => alive && (setItems(rows), setActive(0), scrollRef.current?.scrollTo({ top: 0 })))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
    // the feed is built once per visit (or on reshuffle), not on every toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, s.maxDuration, s.maxSizeMB, s.verticalOnly]);

  // track the slide that fills the viewport
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !items?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const goTo = useCallback((index: number) => {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollTo({ top: index * root.clientHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input,textarea,[contenteditable]")) return;
      const key = event.key.toLowerCase();
      if (key === "arrowdown" || key === "j") event.preventDefault(), goTo(active + 1);
      else if (key === "arrowup" || key === "k") event.preventDefault(), goTo(Math.max(0, active - 1));
      else if (key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  return (
    <AppLayout bare>
      <div className="relative">
        <div
          ref={scrollRef}
          className="h-[calc(100dvh-3.5rem-4rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] md:h-[calc(100dvh-3.5rem)] [&::-webkit-scrollbar]:hidden"
        >
          {items === null ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyLibrary />
              <p className="mt-4 text-center text-sm text-muted-foreground">{t("shorts.empty")}</p>
            </div>
          ) : (
            items.map((item, index) => {
              const near = Math.abs(index - active) <= (s.preloadNext ? 1 : 0);
              return (
                <section key={item.id} data-index={index} className="flex h-full snap-start snap-always items-center justify-center py-2">
                  {near ? (
                    <Slide
                      item={item}
                      active={index === active}
                      muted={muted}
                      speed={speed}
                      onMuted={setMuted}
                      onEnded={() => s.autoScroll && goTo(index + 1)}
                    />
                  ) : (
                    <div className="aspect-[9/16] h-full max-w-full rounded-2xl bg-muted" />
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* desktop helpers */}
        {!!items?.length && (
          <div className="absolute end-4 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex">
            <RoundButton label={t("shorts.previous")} onClick={() => goTo(Math.max(0, active - 1))} disabled={active === 0}>
              <ChevronUp className="h-6 w-6" />
            </RoundButton>
            <RoundButton label={t("shorts.next")} onClick={() => goTo(active + 1)} disabled={active >= items.length - 1}>
              <ChevronDown className="h-6 w-6" />
            </RoundButton>
          </div>
        )}
        <div className="absolute start-3 top-3 flex gap-2">
          <RoundButton label={t("shorts.reshuffle")} onClick={() => setSeed((v) => v + 1)} small>
            <Shuffle className="h-4 w-4" />
          </RoundButton>
          <RoundButton
            label={t("player.speed")}
            small
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
              setSpeed(next);
              void updateSettings({ shorts: { speed: next } });
            }}
          >
            <span className="text-[11px] font-bold" dir="ltr">{speed}×</span>
          </RoundButton>
          <RoundButton
            label={t("shorts.autoScroll")}
            small
            active={s.autoScroll}
            onClick={() => void updateSettings({ shorts: { autoScroll: !s.autoScroll } })}
          >
            <Gauge className="h-4 w-4" />
          </RoundButton>
        </div>
      </div>
    </AppLayout>
  );
};

function RoundButton({
  children,
  label,
  onClick,
  disabled,
  small,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-full bg-secondary text-foreground shadow transition hover:bg-secondary/80 disabled:opacity-40",
        small ? "h-9 w-9" : "h-12 w-12",
        active && "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </button>
  );
}

const Slide = memo(function Slide({
  item,
  active,
  muted,
  speed,
  onMuted,
  onEnded,
}: {
  item: MediaItem;
  active: boolean;
  muted: boolean;
  speed: number;
  onMuted: (v: boolean) => void;
  onEnded: () => void;
}) {
  const { t, settings, favorites, watchLater, toggleFavorite, toggleWatchLater } = useSession();
  const navigate = useNavigate();
  const s = settings.shorts;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | undefined>();
  const [paused, setPaused] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const tapTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const liked = favorites.items.includes(item.id);
  const later = watchLater.items.includes(item.id);

  useEffect(() => {
    let alive = true;
    let release: (() => void) | null = null;
    let thumb: string | null = null;
    openPlayback(item)
      .then((opened) => {
        if (!alive) return opened.release();
        release = opened.release;
        setUrl(opened.url);
      })
      .catch(() => undefined);
    thumbnailUrl(item.id)
      .then((value) => {
        if (!alive) return value && URL.revokeObjectURL(value);
        thumb = value;
        setPoster(value ?? undefined);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      release?.();
      if (thumb) URL.revokeObjectURL(thumb);
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
    };
  }, [item]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.playbackRate = speed;
    video.loop = s.loop && !s.autoScroll;
    if (active) {
      video.play().catch(() => {
        // autoplay with sound blocked: retry muted
        video.muted = true;
        onMuted(true);
        void video.play().catch(() => undefined);
      });
      const timer = window.setTimeout(() => markSeen(item.id), 1200);
      return () => window.clearTimeout(timer);
    }
    video.pause();
    video.currentTime = 0;
  }, [active, url, muted, speed, s.loop, s.autoScroll, item.id, onMuted]);

  useEffect(() => {
    const p = settings.player;
    if (active) applyAudio(videoRef.current, { enabled: p.eqEnabled, bands: p.eqBands, boost: p.boost || 1, limiter: p.limiter });
  }, [active, url, settings.player]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setFlash("play");
    } else {
      video.pause();
      setFlash("pause");
    }
    window.setTimeout(() => setFlash(null), 450);
  };

  const like = () => {
    if (!liked) void toggleFavorite(item.id);
    setBurst((b) => b + 1);
  };

  const onTap = () => {
    if (held.current) return;
    if (!s.doubleTapLike) return toggle();
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      like();
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      toggle();
    }, 240);
  };

  const onDown = () => {
    held.current = false;
    if (!s.holdToPause) return;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      videoRef.current?.pause();
    }, 320);
  };
  const onUp = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (held.current) {
      void videoRef.current?.play().catch(() => undefined);
      window.setTimeout(() => (held.current = false), 50);
    }
  };

  const seek = (event: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let ratio = (event.clientX - rect.left) / rect.width;
    if (getComputedStyle(event.currentTarget).direction === "rtl") ratio = 1 - ratio;
    video.currentTime = Math.max(0, Math.min(1, ratio)) * video.duration;
  };

  return (
    <div className="relative flex h-full items-end gap-3">
      <div className="relative aspect-[9/16] h-full max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl bg-black shadow-xl">
        {url && (
          <video
            ref={videoRef}
            src={url}
            poster={poster}
            playsInline
            preload={active ? "auto" : "metadata"}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onWaiting={() => setWaiting(true)}
            onPlaying={() => setWaiting(false)}
            onLoadedData={() => setWaiting(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={onEnded}
            className={cn("h-full w-full", s.fit === "cover" ? "object-cover" : "object-contain")}
          />
        )}

        {/* gesture surface */}
        <div
          className="absolute inset-0 select-none"
          onClick={onTap}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          onContextMenu={(e) => e.preventDefault()}
        />

        {active && waiting && (
          <Loader2 className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/80" />
        )}
        {(flash || (paused && active && !waiting)) && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white animate-in fade-in zoom-in-75">
            {flash === "play" ? <Play className="h-8 w-8 fill-current" /> : <Pause className="h-8 w-8 fill-current" />}
          </span>
        )}
        {burst > 0 && (
          <Heart
            key={burst}
            className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-youtube-red text-youtube-red animate-out fade-out zoom-out-150 duration-700 fill-mode-forwards"
          />
        )}

        <button
          type="button"
          onClick={() => onMuted(!muted)}
          aria-label={muted ? t("player.unmute") : t("player.mute")}
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {s.showInfo && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pb-5 pe-16 text-white sm:pe-4">
            <p className="text-sm font-semibold">@{item.channel || item.rootName}</p>
            <p className="mt-1 line-clamp-2 text-sm text-white/90">{item.title}</p>
          </div>
        )}

        {s.showProgress && (
          <div className="absolute inset-x-0 bottom-0 h-3 cursor-pointer" onPointerDown={seek}>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
              <div className="h-full bg-youtube-red" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {/* actions — overlaid on narrow screens */}
        <div className="absolute bottom-16 end-2 flex flex-col items-center gap-4 text-white sm:hidden">
          <Actions />
        </div>
      </div>

      <div className="hidden flex-col items-center gap-4 pb-4 sm:flex">
        <Actions />
      </div>
      <ShareDialog item={item} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );

  function Actions() {
    return (
      <>
        <Action label={t("shorts.like")} onClick={() => void toggleFavorite(item.id)} on={liked}>
          <Heart className={cn("h-6 w-6", liked && "fill-youtube-red text-youtube-red")} />
        </Action>
        <Action label={t("shorts.later")} onClick={() => void toggleWatchLater(item.id)} on={later}>
          <Clock className="h-6 w-6" />
        </Action>
        <Action label={t("share.title")} onClick={() => setShareOpen(true)}>
          <Share2 className="h-6 w-6" />
        </Action>
        <Action label={t("shorts.loop")} on={s.loop} onClick={() => void 0}>
          <Repeat className="h-6 w-6" />
        </Action>
        <Action label={t("shorts.open")} onClick={() => navigate(watchHref(locationOf(item)))}>
          <Expand className="h-6 w-6" />
        </Action>
      </>
    );
  }
});

function Action({ children, label, onClick, on }: { children: React.ReactNode; label: string; onClick: () => void; on?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={on} className="flex flex-col items-center gap-1 text-[11px] font-medium">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur sm:bg-secondary sm:text-foreground">
        {children}
      </span>
      <span className="max-w-[4.5rem] truncate">{label}</span>
    </button>
  );
}

export default Shorts;
