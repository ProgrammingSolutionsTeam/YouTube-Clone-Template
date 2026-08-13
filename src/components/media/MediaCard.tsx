import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/core/types";
import { locationOf } from "@/lib/media/library";
import { watchHref, browseHref } from "@/lib/core/paths";
import { thumbnailUrl } from "@/lib/media/mediaService";
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
  const { settings, t } = useSession();
  const [thumb, setThumb] = useState<string | null>(null);
  const location = locationOf(item, rootKey);

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

  const folderHref = browseHref({ rootKey: location.rootKey, segments: location.segments });

  return (
    <article className={cn("group", compact ? "flex gap-3" : "flex flex-col")}>
      <Link
        to={watchHref(location)}
        className={cn(
          "relative aspect-video shrink-0 overflow-hidden rounded-xl bg-secondary shadow-[var(--shadow-card)]",
          compact ? "w-36 sm:w-40" : "w-full",
        )}
      >
        {thumb ? (
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
        <span className="absolute bottom-1.5 end-1.5 rounded bg-youtube-dark/85 px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
          {item.duration ? formatDuration(item.duration) : formatSize(item.size)}
        </span>
      </Link>

      <div className={cn("min-w-0 flex-1", compact ? "" : "mt-3")}>
        <Link to={watchHref(location)}>
          <h3
            className={cn(
              "line-clamp-2 font-semibold transition-colors group-hover:text-youtube-red",
              compact ? "text-[13px] leading-5" : "text-sm leading-5",
            )}
          >
            {item.title}
          </h3>
        </Link>
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
