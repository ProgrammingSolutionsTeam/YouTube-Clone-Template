import { useCallback, useEffect, useState } from "react";
import { Globe2, Plus, Trash2, Wifi } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import type { RootRecord } from "@/lib/core/types";
import { invalidateLibrary } from "@/lib/media/library";
import {
  addServerShare,
  getPeers,
  listServerShares,
  normalizePeer,
  removeServerShare,
  setPeers,
  shareInfo,
  type ShareInfo,
} from "@/lib/share/network";

export function NetworkShareCard({ localRoots }: { localRoots: RootRecord[] }) {
  const { t } = useSession();
  const { toast } = useToast();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [shares, setShares] = useState<{ key: string; label?: string; path: string }[]>([]);
  const [key, setKey] = useState("");
  const [path, setPath] = useState("");
  const [peers, setPeerList] = useState<string[]>(() => getPeers());
  const [peer, setPeer] = useState("");

  const refresh = useCallback(async () => {
    const next = await shareInfo();
    setInfo(next);
    setLoaded(true);
    if (next?.canManage) setShares(await listServerShares());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const share = async (rootKey: string, rootPath: string, label?: string) => {
    const error = await addServerShare({ key: rootKey.trim(), path: rootPath.trim(), label });
    if (error) return toast({ title: t("net.error"), variant: "destructive" });
    invalidateLibrary();
    toast({ title: t("net.shared") });
    setKey("");
    setPath("");
    void refresh();
  };

  const addPeer = () => {
    const origin = normalizePeer(peer);
    if (!origin) return;
    const next = [...new Set([...peers, origin])];
    setPeers(next);
    setPeerList(next);
    setPeer("");
    invalidateLibrary();
  };

  const port = info?.port ?? 8080;
  const sharedKeys = new Set(shares.map((s) => s.key));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wifi className="h-5 w-5 text-youtube-red" />
          {t("net.title")}
        </CardTitle>
        <CardDescription>{t("net.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loaded && !info && <p className="text-sm text-muted-foreground">{t("net.none")}</p>}

        {info && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("net.addresses")}</p>
            <div className="flex flex-wrap gap-2" dir="ltr">
              {info.addresses.map((address) => (
                <Badge key={address} variant="secondary" className="font-mono">
                  http://{address}:{port}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {info && !info.canManage && <p className="text-sm text-muted-foreground">{t("net.managed")}</p>}

        {info?.canManage && (
          <div className="space-y-3">
            {shares.length > 0 && (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {shares.map((s) => (
                  <li key={s.key} className="flex items-center gap-2 bg-secondary/40 px-3 py-2">
                    <Globe2 className="h-4 w-4 shrink-0 text-youtube-red" />
                    <div className="min-w-0 flex-1" dir="ltr">
                      <div className="truncate text-sm font-semibold">root={s.key}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.path}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("net.stop")}
                      onClick={() => void removeServerShare(s.key).then(() => (invalidateLibrary(), refresh()))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {localRoots.filter((r) => r.displayPath && !sharedKeys.has(r.name)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localRoots
                  .filter((r) => r.displayPath && !sharedKeys.has(r.name))
                  .map((r) => (
                    <Button key={r.id} variant="outline" size="sm" onClick={() => void share(r.name, r.displayPath!, r.label)}>
                      <Globe2 className="me-1.5 h-4 w-4" />
                      {t("net.share")}: <span dir="ltr" className="ms-1 font-mono">{r.name}</span>
                    </Button>
                  ))}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={t("roots.key")} dir="ltr" />
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder={t("net.pathLabel")} dir="ltr" />
              <Button disabled={!key.trim() || !path.trim()} onClick={() => void share(key, path)} className="bg-youtube-red hover:bg-youtube-red/90">
                {t("net.share")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm font-semibold">{t("net.peers")}</p>
          <p className="text-xs text-muted-foreground">{t("net.peersHint")}</p>
          <div className="flex gap-2">
            <Input value={peer} onChange={(e) => setPeer(e.target.value)} placeholder="192.168.1.20:8080" dir="ltr" onKeyDown={(e) => e.key === "Enter" && addPeer()} />
            <Button variant="secondary" onClick={addPeer}>
              <Plus className="me-1 h-4 w-4" />
              {t("net.add")}
            </Button>
          </div>
          {peers.length > 0 && (
            <div className="flex flex-wrap gap-2" dir="ltr">
              {peers.map((p) => (
                <Badge key={p} variant="outline" className="gap-1 font-mono">
                  {p}
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    onClick={() => {
                      const next = peers.filter((x) => x !== p);
                      setPeers(next);
                      setPeerList(next);
                      invalidateLibrary();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
