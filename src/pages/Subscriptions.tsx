import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { MediaItemsGrid } from "@/components/media/MediaGrid";
import { Button } from "@/components/ui/button";
import { Tv } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { allItems, sortItems } from "@/lib/media/library";
import { browseHref } from "@/lib/core/paths";
import type { MediaItem } from "@/lib/core/types";

const Subscriptions = () => {
  const { t, settings } = useSession();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const pins = settings.pinnedChannels;

  useEffect(() => {
    let alive = true;
    setItems(null);
    allItems()
      .then((rows) => {
        if (!alive) return;
        const wanted = new Set(pins);
        const filtered = rows.filter(
          (item) => item.dirPath.length > 0 && wanted.has(`${item.rootName}/${item.dirPath[0]}`),
        );
        setItems(sortItems(filtered, "recent").slice(0, 120));
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [pins]);

  return (
    <AppLayout>
      <PageHeading title={t("nav.subscriptions")} description={t("list.pinned")} />

      {pins.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {pins.map((pin) => {
            const [rootKey, ...segments] = pin.split("/");
            return (
              <Button key={pin} asChild variant="secondary" size="sm" className="rounded-full">
                <Link to={browseHref({ rootKey, segments })}>{segments.join(" / ")}</Link>
              </Button>
            );
          })}
        </div>
      )}

      {pins.length === 0 ? (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
          <Tv className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("common.none")}</p>
          <Button asChild className="mt-4 bg-youtube-red hover:bg-youtube-red/90">
            <Link to="/channels">{t("nav.channels")}</Link>
          </Button>
        </div>
      ) : items === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.none")}</p>
      ) : (
        <MediaItemsGrid items={items} />
      )}
    </AppLayout>
  );
};

export default Subscriptions;
