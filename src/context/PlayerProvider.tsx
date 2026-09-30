/**
 * One player for the whole app.
 *
 * A single <Player> lives outside the routes. On the watch page it is laid over
 * a placeholder (the "anchor"); on any other page it shrinks to a floating mini
 * player in the corner. Because the same media element keeps playing, there
 * can never be two videos at once, and picking another video just swaps the
 * item inside it.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2, X } from "lucide-react";
import { Player } from "@/components/media/Player";
import type { MediaItem } from "@/lib/core/types";
import { adjacentItems, locationOf } from "@/lib/media/library";
import { watchHref } from "@/lib/core/paths";
import { useSession } from "@/context/SessionProvider";

interface PlayerContextValue {
  item: MediaItem | null;
  queue: MediaItem[];
  theater: boolean;
  setTheater: (value: boolean | ((v: boolean) => boolean)) => void;
  play: (item: MediaItem, queue?: MediaItem[]) => void;
  stop: () => void;
  setAnchor: (element: HTMLElement | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer outside PlayerProvider");
  return value;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [theater, setTheater] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const play = useCallback((next: MediaItem, nextQueue?: MediaItem[]) => {
    setItem((current) => (current?.id === next.id ? current : next));
    if (nextQueue) setQueue(nextQueue);
  }, []);

  const stop = useCallback(() => {
    setItem(null);
    setQueue([]);
  }, []);

  const value = useMemo(
    () => ({ item, queue, theater, setTheater, play, stop, setAnchor }),
    [item, queue, theater, play, stop],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {item && <PlayerHost item={item} queue={queue} anchor={anchor} />}
    </PlayerContext.Provider>
  );
}

function PlayerHost({ item, queue, anchor }: { item: MediaItem; queue: MediaItem[]; anchor: HTMLElement | null }) {
  const { theater, setTheater, play, stop } = usePlayer();
  const { t } = useSession();
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mini = !anchor;
  const adjacent = useMemo(() => adjacentItems(queue, item.id), [queue, item.id]);

  // Follow the anchor without re-rendering React: document coordinates, so
  // scrolling costs nothing; layout changes are picked up once per frame.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !anchor) return;
    let frame = 0;
    let last = "";
    const sync = () => {
      const rect = anchor.getBoundingClientRect();
      const key = `${rect.left + window.scrollX}|${rect.top + window.scrollY}|${rect.width}`;
      if (key !== last) {
        last = key;
        host.style.left = `${rect.left + window.scrollX}px`;
        host.style.top = `${rect.top + window.scrollY}px`;
        host.style.width = `${rect.width}px`;
      }
      frame = requestAnimationFrame(sync);
    };
    sync();
    const observer = new ResizeObserver(() => {
      anchor.style.height = `${host.offsetHeight}px`;
    });
    observer.observe(host);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.style.left = host.style.top = host.style.width = "";
    };
  }, [anchor]);

  const goTo = (next?: MediaItem) => {
    if (!next) return;
    if (mini) play(next);
    else navigate(watchHref(locationOf(next)));
  };

  return (
    <div
      ref={hostRef}
      className={
        mini
          ? "fixed bottom-20 end-3 z-40 w-[min(360px,calc(100vw-1.5rem))] animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border md:bottom-4"
          : "absolute z-30"
      }
    >
      <Player
        item={item}
        mini={mini}
        theater={theater}
        onTheaterToggle={() => setTheater((v) => !v)}
        onEnded={() => goTo(adjacent.next)}
        onNext={adjacent.next ? () => goTo(adjacent.next) : undefined}
        onPrevious={adjacent.previous ? () => goTo(adjacent.previous) : undefined}
      />
      {mini && (
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate(watchHref(locationOf(item)))}
            className="min-w-0 flex-1 text-start"
          >
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.channel || item.rootName}</p>
          </button>
          <button
            type="button"
            aria-label={t("mini.expand")}
            onClick={() => navigate(watchHref(locationOf(item)))}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("mini.close")}
            onClick={stop}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
