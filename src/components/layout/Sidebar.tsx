import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  mainMenuItems,
  exploreItems,
  settingsItem,
  type NavItem,
} from "@/components/layout/nav-items";
import { useSession } from "@/context/SessionProvider";
import { listChannels } from "@/lib/media/library";
import { browseHref } from "@/lib/core/paths";

interface SidebarProps {
  isOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
}

function NavRow({
  item,
  label,
  active,
  compact,
  onSelect,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={label}
      className={cn(
        "flex w-full items-center rounded-xl text-sm transition-colors",
        compact ? "flex-col gap-1 px-1 py-3 text-[10px]" : "gap-4 px-3 py-2.5",
        active ? "bg-secondary font-semibold text-foreground" : "text-foreground/80 hover:bg-secondary",
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", active && "text-youtube-red")} />
      <span className={cn("truncate", compact && "w-full text-center leading-tight")}>{label}</span>
    </button>
  );
}

function SidebarBody({ compact, onNavigate }: { compact: boolean; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useSession();
  const [channels, setChannels] = useState<{ rootKey: string; name: string; segments: string[] }[]>([]);

  useEffect(() => {
    let alive = true;
    listChannels()
      .then((rows) => alive && setChannels(rows.slice(0, 8)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname]);

  const go = (path: string) => {
    navigate(path);
    onNavigate();
  };

  return (
    <ScrollArea className="h-full">
      <div className={cn("space-y-1 py-3", compact ? "px-1.5" : "px-3")}>
        {mainMenuItems.map((item) => (
          <NavRow
            key={item.path}
            item={item}
            label={t(item.labelKey)}
            compact={compact}
            active={pathname === item.path}
            onSelect={() => go(item.path)}
          />
        ))}

        <Separator className="my-3" />

        {!compact && (
          <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nav.explore")}
          </h3>
        )}
        {exploreItems.map((item) => (
          <NavRow
            key={item.path}
            item={item}
            label={t(item.labelKey)}
            compact={compact}
            active={pathname === item.path}
            onSelect={() => go(item.path)}
          />
        ))}

        {!compact && channels.length > 0 && (
          <>
            <Separator className="my-3" />
            <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nav.channels")}
            </h3>
            {channels.map((c) => (
              <button
                key={`${c.rootKey}/${c.name}`}
                onClick={() => go(browseHref({ rootKey: c.rootKey, segments: c.segments }))}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-secondary text-[10px]">{c.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </>
        )}

        <Separator className="my-3" />
        <NavRow
          item={settingsItem}
          label={t(settingsItem.labelKey)}
          compact={compact}
          active={pathname === settingsItem.path}
          onSelect={() => go(settingsItem.path)}
        />
      </div>
    </ScrollArea>
  );
}

export function Sidebar({ isOpen, collapsed, onClose }: SidebarProps) {
  const { dir } = useSession();
  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 p-0 pt-12 lg:hidden">
          <SidebarBody compact={false} onNavigate={onClose} />
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "fixed top-14 bottom-0 hidden border-s border-youtube-border bg-background transition-[width] duration-300 lg:block",
          "start-0",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <SidebarBody compact={collapsed} onNavigate={() => {}} />
      </aside>
    </>
  );
}
