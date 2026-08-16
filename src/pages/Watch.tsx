import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Player } from "@/components/media/Player";
import { MediaCard } from "@/components/media/MediaCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/SessionProvider";
import { browseHref, locationVars, parseQuery, watchHref } from "@/lib/core/paths";
import { getItem } from "@/lib/media/mediaService";
import { adjacentItems, listLocation, locationOf } from "@/lib/media/library";
import { formatSize, formatDuration } from "@/lib/format";
import type { MediaItem } from "@/lib/core/types";
import { ArrowLeft, ListVideo, Play } from "lucide-react";

const Watch = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { t } = useSession();
  const id = videoId ?? params.get("v") ?? "";

  const [item, setItem] = useState<MediaItem | null>(null);
  const [siblings, setSiblings] = useState<MediaItem[]>([]);
  const [missing, setMissing] = useState(false);
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    let alive = true;
    setItem(null);
    setMissing(false);
    (async () => {
      const found = id ? await getItem(id) : null;
      if (!alive) return;
      if (!found) return setMissing(true);
      setItem(found);
      const listing = await listLocation(found.rootName, found.dirPath);
      if (alive) setSiblings(adjacentItems(listing.items, found.id).ordered);
    })().catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const location = useMemo(() => (item ? locationOf(item) : parseQuery(params)), [item, params]);

  const adjacent = useMemo(() => adjacentItems(siblings, id), [id, siblings]);

  const playNext = () => {
    const next = adjacent.next;
    if (next) navigate(watchHref(locationOf(next)));
  };

  const playPrevious = () => {
    const previous = adjacent.previous;
    if (previous) navigate(watchHref(locationOf(previous)));
  };


  if (missing) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("watch.missing")}</p>
          <Button asChild className="mt-4 bg-youtube-red hover:bg-youtube-red/90">
            <Link to="/settings">{t("home.openSettings")}</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout bare>
      <div
        className={
          theater
            ? "mx-auto flex w-full max-w-[1800px] flex-col gap-6 p-0 sm:p-4"
            : "mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-0 sm:p-4 xl:flex-row"
        }
      >
        <div className="min-w-0 flex-1">
          {item ? (
            <Player
              item={item}
              theater={theater}
              onTheaterToggle={() => setTheater((v) => !v)}
              onEnded={playNext}
              onNext={adjacent.next ? playNext : undefined}
              onPrevious={adjacent.previous ? playPrevious : undefined}
            />

          ) : (
            <div className="aspect-video w-full animate-pulse bg-secondary sm:rounded-xl" />
          )}

          {item && (
            <div className="px-3 pt-4 sm:px-0">
              <Button
                variant="ghost"
                size="sm"
                className="mb-2"
                onClick={() => {
                  if (routeLocation.key !== "default") navigate(-1);
                  else navigate(browseHref({ rootKey: location.rootKey, segments: location.segments }));
                }}
              >
                <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                {t("common.back")}
              </Button>
              <h1 className="text-lg font-bold leading-7 sm:text-xl">{item.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button asChild variant="secondary" size="sm" className="rounded-full">
                  <Link to={browseHref({ rootKey: location.rootKey, segments: location.segments.slice(0, 1) })}>
                    {item.channel || location.rootKey}
                  </Link>
                </Button>
                {item.playlist && (
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link to={browseHref({ rootKey: location.rootKey, segments: location.segments })}>
                      {item.playlist}
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                <h2 className="mb-2 text-sm font-semibold">{t("watch.details")}</h2>
                <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <div>
                    <dt>{t("watch.size")}</dt>
                    <dd className="font-medium text-foreground">{formatSize(item.size)}</dd>
                  </div>
                  <div>
                    <dt>{t("watch.container")}</dt>
                    <dd className="font-medium text-foreground" dir="ltr">
                      {item.container || item.extension}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("watch.resolution")}</dt>
                    <dd className="font-medium text-foreground" dir="ltr">
                      {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("player.speed")}</dt>
                    <dd className="font-medium text-foreground" dir="ltr">
                      {formatDuration(item.duration)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5" dir="ltr">
                  {locationVars(location).map((variable) => (
                    <Badge key={variable} variant="outline" className="font-mono text-[11px]">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className={theater ? "px-3 pb-6 sm:px-0" : "px-3 pb-6 sm:px-0 xl:w-[380px] xl:shrink-0"}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ListVideo className="h-4 w-4" />
            {t("watch.playlist")}
          </h2>
          {siblings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.none")}</p>
          ) : (
            <div className={theater ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4" : "space-y-3"}>
              {siblings.slice(0, 50).map((sibling) =>
                sibling.id === item?.id ? (
                  <div key={sibling.id} aria-current="true" className="flex min-h-20 items-center gap-3 border-s-4 border-youtube-red bg-secondary p-3">
                    <Play className="h-4 w-4 shrink-0 fill-youtube-red text-youtube-red" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold">{sibling.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("watch.nowPlaying")}</p>
                    </div>
                  </div>
                ) : (
                  <MediaCard key={sibling.id} item={sibling} compact={!theater} />
                ),
              )}
            </div>
          )}
        </aside>
      </div>
    </AppLayout>
  );
};

export default Watch;
