import { NavLink } from "react-router-dom";
import { mobileNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-youtube-border bg-background/95 backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-around">
        {mobileNavItems.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors",
                  isActive ? "text-youtube-red" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-5 w-5", isActive && "fill-current/10")} />
                  <span className="max-w-full truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
