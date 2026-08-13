import { useLocation, useNavigate } from "react-router-dom";
import { FolderTree, Home, Library, Settings, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionProvider";

const items: { path: string; labelKey: string; icon: LucideIcon }[] = [
  { path: "/", labelKey: "nav.home", icon: Home },
  { path: "/browse", labelKey: "nav.browse", icon: FolderTree },
  { path: "/trending", labelKey: "nav.trending", icon: TrendingUp },
  { path: "/library", labelKey: "nav.library", icon: Library },
  { path: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function MobileNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useSession();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-youtube-border bg-background/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <li key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 py-2 text-[10px] transition-colors",
                  active ? "text-youtube-red" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate px-0.5">{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
