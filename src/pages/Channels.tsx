import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyLibrary } from "@/components/media/MediaGrid";
import { ListVideo, Pin, PinOff, Video } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { listChannels } from "@/lib/media/library";
import { browseHref } from "@/lib/core/paths";
import { ACCENTS } from "@/lib/vault/settings";

interface ChannelRow {
  rootKey: string;
  name: string;
  segments: string[];
  itemCount: number;
  playlistCount: number;
}

const Channels = () => {
  const { t, settings, updateSettings } = useSession();
  const [rows, setRows] = useState<ChannelRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    listChannels()
      .then((result) => alive && setRows(result))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  const togglePin = (key: string) => {
    void updateSettings({
      pinnedChannels: settings.pinnedChannels.includes(key)
        ? settings.pinnedChannels.filter((x) => x !== key)
        : [key, ...settings.pinnedChannels],
    });
  };

  return (
    <AppLayout>
      <PageHeading title={t("nav.channels")} description={t("roots.desc")} />
      {rows === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((channel, index) => {
            const key = `${channel.rootKey}/${channel.name}`;
            const pinned = settings.pinnedChannels.includes(key);
            return (
              <Card key={key} className="transition-shadow hover:shadow-[var(--shadow-hover)]">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback
                      className="font-bold text-primary-foreground"
                      style={{ backgroundColor: `hsl(${ACCENTS[index % ACCENTS.length].hsl})` }}
                    >
                      {channel.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{channel.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 font-mono text-[11px]" dir="ltr">
                      root={channel.rootKey} c={channel.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-secondary/60 py-2">
                      <Video className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-semibold">{channel.itemCount}</div>
                      <div className="text-[11px] text-muted-foreground">{t("common.videos")}</div>
                    </div>
                    <div className="rounded-lg bg-secondary/60 py-2">
                      <ListVideo className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                      <div className="text-sm font-semibold">{channel.playlistCount}</div>
                      <div className="text-[11px] text-muted-foreground">{t("common.playlist")}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={browseHref({ rootKey: channel.rootKey, segments: channel.segments })}>
                        {t("nav.browse")}
                      </Link>
                    </Button>
                    <Button
                      variant={pinned ? "secondary" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => togglePin(key)}
                    >
                      {pinned ? <PinOff className="me-1 h-4 w-4" /> : <Pin className="me-1 h-4 w-4" />}
                      {pinned ? t("browse.unpin") : t("browse.pin")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Channels;
