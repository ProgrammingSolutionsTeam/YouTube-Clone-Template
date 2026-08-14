import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { MediaItemsGrid } from "@/components/media/MediaGrid";
import { useSession } from "@/context/SessionProvider";
import { searchLibrary } from "@/lib/media/library";
import type { MediaItem } from "@/lib/core/types";

const Search = () => {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const { t } = useSession();
  const [items, setItems] = useState<MediaItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    searchLibrary(query)
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [query]);

  return (
    <AppLayout>
      <PageHeading title={t("search.title")} description={`${t("search.for")}: ${query}`} />
      {items === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("search.empty")}</p>
      ) : (
        <MediaItemsGrid items={items} />
      )}
    </AppLayout>
  );
};

export default Search;
