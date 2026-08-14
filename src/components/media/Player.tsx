/**
 * Local media player.
 *
 * Streams the on-disk file lazily through an object URL (range reads from disk),
 * converts any sidecar subtitle to WebVTT on the fly, and remembers the resume
 * position in the encrypted profile folder.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Heart,
  Link2,
  Maximize2,
  PictureInPicture2,
  Repeat,
  Subtitles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/core/types";
import { locationOf } from "@/lib/media/library";
import { watchHref } from "@/lib/core/paths";
import { downloadMedia, openPlayback, openSubtitle, probeItem, saveProbe } from "@/lib/media/mediaService";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function Player({
  item,
  onEnded,
  theater,
  onTheaterToggle,
}: {
  item: MediaItem;
  onEnded?: () => void;
  theater: boolean;
  onTheaterToggle: () => void;
}) {
  const { settings, favorites, watchLater, toggleFavorite, toggleWatchLater, recordWatch, t } = useSession();
  const { toast } = useToast();
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [source, setSource] = useState<{ url: string; mimeType: string; directPlay: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(settings.player.defaultSpeed);
  const [loop, setLoop] = useState(settings.player.loopByDefault);
  const [subtitleId, setSubtitleId] = useState<string>("off");
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [qualityId, setQualityId] = useState<string>(item.qualities[0]?.id ?? "original");

  const isFavorite = favorites.items.includes(item.id);
  const isLater = watchLater.items.includes(item.id);

  /* ---------------------------------------------------------------- source */
  useEffect(() => {
    let release: (() => void) | null = null;
    let alive = true;
    setSource(null);
    setError(null);
    (async () => {
      try {
        const opened = await openPlayback(item, qualityId === "original" ? undefined : qualityId);
        if (!alive) return opened.release();
        release = opened.release;
        setSource({ url: opened.url, mimeType: opened.mimeType, directPlay: opened.directPlay });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "unreadable");
      }
    })();
    return () => {
      alive = false;
      release?.();
    };
  }, [item, qualityId]);

  /* ------------------------------------------------------------- subtitles */
  useEffect(() => {
    let release: (() => void) | null = null;
    let alive = true;
    setSubtitleUrl(null);
    if (subtitleId === "off") return;
    (async () => {
      try {
        const opened = await openSubtitle(item, subtitleId, { delay: settings.player.subtitleDelay });
        if (!alive) return opened.release();
        release = opened.release;
        setSubtitleUrl(opened.url);
      } catch {
        /* unreadable subtitle is simply skipped */
      }
    })();
    return () => {
      alive = false;
      release?.();
    };
  }, [item, subtitleId, settings.player.subtitleDelay]);

  // preferred subtitle track once, when enabled in settings
  useEffect(() => {
    if (!settings.player.subtitlesEnabled || !item.subtitles.length) {
      setSubtitleId("off");
      return;
    }
    const preferred =
      item.subtitles.find((s) => s.language === settings.player.subtitleLanguage) ?? item.subtitles[0];
    setSubtitleId(preferred.id);
  }, [item, settings.player.subtitleLanguage, settings.player.subtitlesEnabled]);

  /* -------------------------------------------------- volume / speed / loop */
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.volume = settings.player.volume;
    media.muted = settings.player.muted;
    media.playbackRate = speed;
    media.loop = loop;
  }, [loop, settings.player.muted, settings.player.volume, source, speed]);

  /* -------------------------------------------------- metadata + thumbnail */
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
  const location = locationOf(item);

  const save = useCallback(
    (position: number, duration: number) => {
      void recordWatch({
        id: item.id,
        title: item.title,
        rootKey: location.rootKey,
        segments: location.segments,
        channel: item.channel,
        at: Date.now(),
        position,
        duration,
      });
    },
    [item, location.rootKey, location.segments, recordWatch],
  );

  const onLoaded = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = speed;
    if (!resumeApplied.current && settings.player.rememberPosition) {
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
    window.sessionStorage.setItem(`resume:${item.id}`, String(Math.floor(media.currentTime)));
  };

  useEffect(() => {
    resumeApplied.current = false;
    return () => {
      const media = mediaRef.current;
      if (media && media.currentTime > 3) save(media.currentTime, media.duration || 0);
    };
  }, [item.id, save]);

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

  const isAudio = item.kind === "audio";

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative w-full overflow-hidden bg-black sm:rounded-xl",
          theater ? "aspect-[21/9] max-h-[80vh]" : "aspect-video",
        )}
      >
        {error || (source && !source.directPlay && !isAudio) ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="text-sm text-primary-foreground/85">{t("player.unsupported")}</p>
              <Button className="mt-3" variant="secondary" onClick={() => void downloadMedia(item)}>
                <Download className="me-2 h-4 w-4" />
                {t("player.download")}
              </Button>
            </div>
          </div>
        ) : source ? (
          <video
            ref={mediaRef}
            key={source.url}
            src={source.url}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            onLoadedMetadata={onLoaded}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => {
              if (settings.player.autoplayNext) onEnded?.();
            }}
            className="h-full w-full bg-black"
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
        ) : (
          <div className="grid h-full place-items-center text-sm text-primary-foreground/70">
            {t("common.loading")}
          </div>
        )}
      </div>

      {/* extra controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-3 sm:px-0">
        <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
          <SelectTrigger className="h-9 w-[124px]">
            <SelectValue placeholder={t("player.speed")} />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {t("player.speed")} {s}×
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {item.subtitles.length > 0 && (
          <Select value={subtitleId} onValueChange={setSubtitleId}>
            <SelectTrigger className="h-9 w-[150px]">
              <Subtitles className="me-2 h-4 w-4" />
              <SelectValue placeholder={t("player.subtitles")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">{t("player.off")}</SelectItem>
              {item.subtitles.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {item.qualities.length > 0 && (
          <Select value={qualityId} onValueChange={setQualityId}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder={t("player.quality")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">{t("player.quality")}</SelectItem>
              {item.qualities.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant={isFavorite ? "default" : "ghost"}
            size="sm"
            onClick={() => void toggleFavorite(item.id)}
            className={cn(isFavorite && "bg-youtube-red hover:bg-youtube-red/90")}
          >
            <Heart className={cn("me-1.5 h-4 w-4", isFavorite && "fill-current")} />
            <span className="hidden sm:inline">
              {isFavorite ? t("player.unfavorite") : t("player.favorite")}
            </span>
          </Button>
          <Button variant={isLater ? "secondary" : "ghost"} size="sm" onClick={() => void toggleWatchLater(item.id)}>
            <Clock className="me-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{t("player.watchLater")}</span>
          </Button>
          <Button variant={loop ? "secondary" : "ghost"} size="icon" title={t("player.loop")} onClick={() => setLoop((v) => !v)}>
            <Repeat className="h-4 w-4" />
          </Button>
          {settings.player.pipEnabled && !isAudio && (
            <Button variant="ghost" size="icon" title={t("player.pip")} onClick={() => void togglePip()}>
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant={theater ? "secondary" : "ghost"}
            size="icon"
            title={t("player.theater")}
            onClick={onTheaterToggle}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title={t("watch.share")} onClick={() => void share()}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title={t("player.download")} onClick={() => void downloadMedia(item)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
