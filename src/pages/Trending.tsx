import { useEffect, useState } from "react";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { MediaItemsGrid, EmptyLibrary } from "@/components/media/MediaGrid";
import { useSession } from "@/context/SessionProvider";
import { itemsByIds } from "@/lib/media/library";
import type { MediaItem } from "@/lib/core/types";

const Trending = () => {
  const { t, history } = useSession();
  const [items, setItems] = useState<MediaItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    const ranked = [...history].sort((a, b) => b.count - a.count).map((h) => h.id);
    itemsByIds(ranked)
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [history]);

  return (
    <AppLayout>
      <PageHeading title={t("nav.trending")} description={t("list.history")} />
      {items === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <MediaItemsGrid items={items} />
      )}
    </AppLayout>
  );
};

export default Trending;
