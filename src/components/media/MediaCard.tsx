import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Film, Heart, MoreVertical, Music, Play, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/core/types";
import { locationOf } from "@/lib/media/library";
import { watchHref, browseHref } from "@/lib/core/paths";
import { thumbnailUrl, openPlayback } from "@/lib/media/mediaService";
import { formatDuration, formatSize, timeAgo } from "@/lib/format";
import { useSession } from "@/context/SessionProvider";

export function MediaCard({
  item,
  rootKey,
  compact = false,
}: {
  item: MediaItem;
  rootKey?: string;
  compact?: boolean;
}) {
  const { settings, favorites, watchLater, history, toggleFavorite, toggleWatchLater, t } = useSession();
  const [thumb, setThumb] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const releasePreview = useRef<(() => void) | null>(null);
  const location = locationOf(item, rootKey);

  const watched = history.find((entry) => entry.id === item.id);
  const watchedPercent =
    watched && watched.duration ? Math.min(100, (watched.position / watched.duration) * 100) : 0;
  const isFavorite = favorites.items.includes(item.id);
  const isLater = watchLater.items.includes(item.id);

  useEffect(() => {
    if (!settings.library.showThumbnails) return;
    let url: string | null = null;
    let alive = true;
    thumbnailUrl(item.id)
      .then((value) => {
        if (!alive) return;
        url = value;
        setThumb(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.id, settings.library.showThumbnails]);

  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
      releasePreview.current?.();
    },
    [],
  );

  const startPreview = () => {
    if (item.kind !== "video" || !item.directPlay || preview) return;
    hoverTimer.current = window.setTimeout(() => {
      openPlayback(item)
        .then((opened) => {
          releasePreview.current = opened.release;
          setPreview(opened.url);
        })
        .catch(() => undefined);
    }, 650);
  };

  const stopPreview = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    releasePreview.current?.();
    releasePreview.current = null;
    setPreview(null);
  };

  const folderHref = browseHref({ rootKey: location.rootKey, segments: location.segments });

  return (
    <article
      className={cn("group relative", compact ? "flex gap-3" : "flex flex-col")}
      onPointerEnter={startPreview}
      onPointerLeave={stopPreview}
    >
      <Link
        to={watchHref(location)}
        className={cn(
          "relative aspect-video shrink-0 overflow-hidden rounded-xl bg-secondary shadow-[var(--shadow-card)]",
          compact ? "w-36 sm:w-40" : "w-full",
        )}
      >
        {preview ? (
          <video src={preview} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        ) : thumb ? (
          <img
            src={thumb}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            {item.kind === "audio" ? <Music className="h-8 w-8" /> : <Film className="h-8 w-8" />}
          </span>
        )}

        {/* hover play affordance */}
        <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white">
            <Play className="ms-0.5 h-5 w-5 fill-current" />
          </span>
        </span>

        <span className="absolute bottom-1.5 end-1.5 rounded bg-youtube-dark/85 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {item.duration ? formatDuration(item.duration) : formatSize(item.size)}
        </span>

        {!item.directPlay && (
          <span className="absolute top-1.5 start-1.5 rounded bg-youtube-dark/85 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white" dir="ltr">
            {item.extension}
          </span>
        )}

        {watchedPercent > 1 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
            <span className="block h-full bg-youtube-red" style={{ width: `${watchedPercent}%` }} />
          </span>
        )}
      </Link>

      <div className={cn("min-w-0 flex-1", compact ? "" : "mt-3")}>
        <div className="flex items-start gap-1">
          <Link to={watchHref(location)} className="min-w-0 flex-1">
            <h3
              className={cn(
                "line-clamp-2 font-semibold transition-colors group-hover:text-youtube-red",
                compact ? "text-[13px] leading-5" : "text-sm leading-5",
              )}
            >
              {item.title}
            </h3>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("card.more")}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary focus:opacity-100 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void toggleWatchLater(item.id)}>
                <Clock className="me-2 h-4 w-4" />
                {isLater ? t("card.removeLater") : t("player.watchLater")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void toggleFavorite(item.id)}>
                <Heart className={cn("me-2 h-4 w-4", isFavorite && "fill-current text-youtube-red")} />
                {isFavorite ? t("player.unfavorite") : t("player.favorite")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`${window.location.origin}${watchHref(location)}`)
                    .catch(() => undefined);
                }}
              >
                <Share2 className="me-2 h-4 w-4" />
                {t("watch.share")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link to={folderHref} className="mt-1 block truncate text-xs text-muted-foreground hover:text-foreground">
          {[location.rootKey, ...location.segments].join(" / ")}
        </Link>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.kind === "audio" ? t("home.audio") : t("home.video")} • {formatSize(item.size)} •{" "}
          {timeAgo(item.fileModifiedAt, settings.language)}
        </p>
      </div>
    </article>
  );
}
