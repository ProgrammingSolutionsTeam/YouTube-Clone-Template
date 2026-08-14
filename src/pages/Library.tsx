import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { MediaItemsGrid, EmptyLibrary } from "@/components/media/MediaGrid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { itemsByIds, listItems } from "@/lib/media/library";
import type { MediaItem } from "@/lib/core/types";

type TabKey = "all" | "history" | "liked" | "later";

const Library = () => {
  const { pathname } = useLocation();
  const { t, favorites, watchLater, history, clearHistory, settings } = useSession();
  const initial: TabKey = pathname === "/history" ? "history" : pathname === "/liked" ? "liked" : pathname === "/later" ? "later" : "all";
  const [tab, setTab] = useState<TabKey>(initial);
  const [items, setItems] = useState<MediaItem[] | null>(null);

  useEffect(() => setTab(initial), [initial]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    (async () => {
      let rows: MediaItem[] = [];
      if (tab === "all") rows = await listItems({ sortBy: settings.library.sortBy, kind: settings.library.kindFilter });
      else if (tab === "liked") rows = await itemsByIds(favorites.items);
      else if (tab === "later") rows = await itemsByIds(watchLater.items);
      else rows = await itemsByIds(history.map((h) => h.id));
      if (alive) setItems(rows);
    })().catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [favorites.items, history, settings.library.kindFilter, settings.library.sortBy, tab, watchLater.items]);

  const titles: Record<TabKey, string> = {
    all: t("list.all"),
    history: t("list.history"),
    liked: t("list.favorites"),
    later: t("list.watchLater"),
  };

  return (
    <AppLayout>
      <PageHeading
        title={t("nav.library")}
        description={titles[tab]}
        action={
          tab === "history" && history.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => void clearHistory()}>
              <Trash2 className="me-1.5 h-4 w-4" />
              {t("library.clearHistory")}
            </Button>
          ) : undefined
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          {(Object.keys(titles) as TabKey[]).map((key) => (
            <TabsTrigger key={key} value={key} className="flex-1 sm:flex-none">
              {titles[key]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab}>
          {items === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            tab === "all" ? (
              <EmptyLibrary />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("common.none")}</p>
            )
          ) : (
            <MediaItemsGrid items={items} />
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Library;
