import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { MediaItemsGrid, EmptyLibrary } from "@/components/media/MediaGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Folder, ChevronLeft, Pin, PinOff } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { browseHref, locationVars, parseQuery } from "@/lib/core/paths";
import { listLocation, listRoots, type LocationListing } from "@/lib/media/library";

const Browse = () => {
  const [params] = useSearchParams();
  const { t, settings, updateSettings } = useSession();
  const location = parseQuery(params);
  const [listing, setListing] = useState<LocationListing | null>(null);
  const [roots, setRoots] = useState<{ id: string; name: string; itemCount?: number }[]>([]);

  useEffect(() => {
    let alive = true;
    listRoots()
      .then((rows) => alive && setRoots(rows.map((r) => ({ id: r.id, name: r.name, itemCount: r.itemCount }))))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!location.rootKey) return setListing(null);
    let alive = true;
    setListing(null);
    listLocation(location.rootKey, location.segments)
      .then((result) => alive && setListing(result))
      .catch(() => alive && setListing({ folders: [], items: [], totalDeep: 0 }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.rootKey, location.segments.join("/")]);

  const channelKey = location.segments.length ? `${location.rootKey}/${location.segments[0]}` : null;
  const pinned = channelKey ? settings.pinnedChannels.includes(channelKey) : false;
  const togglePin = () => {
    if (!channelKey) return;
    void updateSettings({
      pinnedChannels: pinned
        ? settings.pinnedChannels.filter((x) => x !== channelKey)
        : [channelKey, ...settings.pinnedChannels],
    });
  };

  const parent =
    location.segments.length > 0
      ? browseHref({ rootKey: location.rootKey, segments: location.segments.slice(0, -1) })
      : null;

  if (!location.rootKey) {
    return (
      <AppLayout>
        <PageHeading title={t("browse.title")} description={t("browse.pickRoot")} />
        {roots.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((root) => (
              <Link
                key={root.id}
                to={browseHref({ rootKey: root.name, segments: [] })}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
              >
                <Folder className="h-6 w-6 text-youtube-red" />
                <div className="min-w-0">
                  <div className="truncate font-semibold" dir="ltr">
                    root={root.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {root.itemCount ?? 0} {t("roots.count")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeading
        title={location.segments[location.segments.length - 1] ?? `root=${location.rootKey}`}
        description={[location.rootKey, ...location.segments].join(" / ")}
        action={
          <div className="flex gap-2">
            {parent && (
              <Button variant="outline" size="sm" asChild>
                <Link to={parent}>
                  <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" />
                  {t("common.back")}
                </Link>
              </Button>
            )}
            {channelKey && (
              <Button variant={pinned ? "secondary" : "outline"} size="sm" onClick={togglePin}>
                {pinned ? <PinOff className="me-1 h-4 w-4" /> : <Pin className="me-1 h-4 w-4" />}
                {pinned ? t("browse.unpin") : t("browse.pin")}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5" dir="ltr">
        {locationVars(location).map((variable) => (
          <Badge key={variable} variant="outline" className="font-mono text-[11px]">
            {variable}
          </Badge>
        ))}
      </div>

      {listing === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-8">
          {listing.folders.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("browse.folders")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {listing.folders.map((folder) => (
                  <Link
                    key={folder.name}
                    to={browseHref({ rootKey: location.rootKey, segments: folder.segments })}
                    className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
                  >
                    <Folder className="mb-2 h-6 w-6 text-youtube-red" />
                    <div className="truncate text-sm font-semibold">{folder.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {folder.itemCount} {t("common.items")}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("browse.items")}</h2>
            {listing.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.none")}</p>
            ) : (
              <MediaItemsGrid items={listing.items} />
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
};

export default Browse;
