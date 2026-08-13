import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media/MediaCard";
import { listItems, rootKeyMap, type ListOptions } from "@/lib/media/library";
import type { MediaItem } from "@/lib/core/types";
import { useSession } from "@/context/SessionProvider";
import { cn } from "@/lib/utils";

const DENSITY: Record<string, string> = {
  compact: "grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7",
  comfortable: "grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  spacious: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
};

export function MediaItemsGrid({ items, rootKeys }: { items: MediaItem[]; rootKeys?: Map<string, string> }) {
  const { settings } = useSession();
  return (
    <div className={cn("grid gap-x-4 gap-y-6", DENSITY[settings.library.gridDensity])}>
      {items.map((item) => (
        <MediaCard key={item.id} item={item} rootKey={rootKeys?.get(item.rootId)} />
      ))}
    </div>
  );
}

export function EmptyLibrary() {
  const { t } = useSession();
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
      <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-bold">{t("home.empty.title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("home.empty.body")}</p>
      <Button asChild className="mt-4 bg-youtube-red hover:bg-youtube-red/90">
        <Link to="/settings">
          <Settings className="me-2 h-4 w-4" />
          {t("home.openSettings")}
        </Link>
      </Button>
    </div>
  );
}

/** Data-loading grid used by the home page and the simple list pages. */
export function MediaGrid(options: ListOptions = {}) {
  const { settings } = useSession();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [rootKeys, setRootKeys] = useState<Map<string, string>>(new Map());

  const { kind, sortBy, limit, rootId } = options;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rows, keys] = await Promise.all([
        listItems({
          kind: kind ?? settings.library.kindFilter,
          sortBy: sortBy ?? settings.library.sortBy,
          hideUnavailable: settings.library.hideUnavailable,
          limit: limit ?? settings.library.itemsPerPage,
          rootId,
        }),
        rootKeyMap(),
      ]);
      if (!alive) return;
      setItems(rows);
      setRootKeys(keys);
    })().catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [kind, limit, rootId, sortBy, settings.library]);

  if (items === null) return <div className="py-10 text-center text-sm text-muted-foreground">…</div>;
  if (!items.length) return <EmptyLibrary />;
  return <MediaItemsGrid items={items} rootKeys={rootKeys} />;
}
