import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import {
  mainMenuItems,
  exploreItems,
  settingsItem,
  type NavItem,
} from "@/components/layout/nav-items";

interface SidebarProps {
  isOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
}

const channels = [
  { name: "أفلام وثائقية", avatar: "/placeholder.svg" },
  { name: "موسيقى", avatar: "/placeholder.svg" },
  { name: "ألعاب", avatar: "/placeholder.svg" },
  { name: "دروس برمجة", avatar: "/placeholder.svg" },
];

function NavRow({
  item,
  active,
  compact,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      title={item.label}
      className={cn(
        "flex w-full items-center rounded-xl text-sm transition-colors",
        compact
          ? "flex-col gap-1 px-1 py-3 text-[10px]"
          : "gap-4 px-3 py-2.5",
        active
          ? "bg-secondary font-semibold text-foreground"
          : "text-foreground/80 hover:bg-secondary"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", active && "text-youtube-red")} />
      <span className={cn("truncate", compact && "w-full text-center leading-tight")}>
        {item.label}
      </span>
    </button>
  );
}

function SidebarBody({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
            compact={compact}
            active={pathname === item.path}
            onSelect={() => go(item.path)}
          />
        ))}

        <Separator className="my-3" />

        {!compact && (
          <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            استكشاف
          </h3>
        )}
        {exploreItems.map((item) => (
          <NavRow
            key={item.path}
            item={item}
            compact={compact}
            active={pathname === item.path}
            onSelect={() => go(item.path)}
          />
        ))}

        {!compact && (
          <>
            <Separator className="my-3" />
            <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              القنوات
            </h3>
            {channels.map((c) => (
              <button
                key={c.name}
                onClick={() => go("/channels")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={c.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {c.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </>
        )}

        <Separator className="my-3" />
        <NavRow
          item={settingsItem}
          compact={compact}
          active={pathname === settingsItem.path}
          onSelect={() => go(settingsItem.path)}
        />
      </div>
    </ScrollArea>
  );
}

export function Sidebar({ isOpen, collapsed, onClose }: SidebarProps) {
  return (
    <>
      {/* الجوال / التابلت: درج منسدل */}
      <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-72 p-0 pt-12 lg:hidden">
          <SidebarBody compact={false} onNavigate={onClose} />
        </SheetContent>
      </Sheet>

      {/* سطح المكتب */}
      <aside
        className={cn(
          "fixed top-14 bottom-0 hidden border-e border-youtube-border bg-background transition-[width] duration-300 lg:block",
          "end-0",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <SidebarBody compact={collapsed} onNavigate={() => {}} />
      </aside>
    </>
  );
}
