import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MediaItemsGrid, EmptyLibrary } from "@/components/media/MediaGrid";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionProvider";
import { listChannels, listItems, rootKeyMap } from "@/lib/media/library";
import type { MediaItem } from "@/lib/core/types";

const Index = () => {
  const { t, settings } = useSession();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [rootKeys, setRootKeys] = useState<Map<string, string>>(new Map());
  const [channels, setChannels] = useState<string[]>([]);
  const [chip, setChip] = useState<string>("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rows, keys, chans] = await Promise.all([
        listItems({
          kind: settings.library.kindFilter,
          sortBy: settings.library.sortBy,
          hideUnavailable: settings.library.hideUnavailable,
          limit: settings.library.itemsPerPage,
        }),
        rootKeyMap(),
        listChannels(),
      ]);
      if (!alive) return;
      setItems(rows);
      setRootKeys(keys);
      setChannels(chans.slice(0, 12).map((c) => c.name));
    })().catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [settings.library]);

  const chips = useMemo(
    () => [
      { key: "all", label: t("home.all") },
      { key: "video", label: t("home.video") },
      { key: "audio", label: t("home.audio") },
      ...channels.map((name) => ({ key: `c:${name}`, label: name })),
    ],
    [channels, t],
  );

  const visible = useMemo(() => {
    if (!items) return [];
    if (chip === "all") return items;
    if (chip === "video" || chip === "audio") return items.filter((i) => i.kind === chip);
    const name = chip.slice(2);
    return items.filter((i) => i.dirPath[0] === name);
  }, [chip, items]);

  return (
    <AppLayout bare>
      <div className="sticky top-14 z-30 border-b border-youtube-border bg-background/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setChip(c.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
                chip === c.key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-foreground/80 hover:bg-youtube-light-gray",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
        {items === null ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <>
            <h1 className="mb-4 text-lg font-bold sm:text-xl">{t("home.latest")}</h1>
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("common.none")}</p>
            ) : (
              <MediaItemsGrid items={visible} rootKeys={rootKeys} />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
