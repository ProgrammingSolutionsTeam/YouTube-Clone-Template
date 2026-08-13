import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, LogIn, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, settings, updateSettings, signOut, t, folder } = useSession();
  const dark = settings.theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-secondary">
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className="text-xs font-bold text-primary-foreground"
              style={{ backgroundColor: user ? `hsl(${user.avatarColor})` : "hsl(var(--youtube-red))" }}
            >
              {user ? user.displayName.slice(0, 2) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm font-semibold">{user ? user.displayName : t("common.guest")}</div>
          <div className="truncate text-xs font-normal text-muted-foreground" dir="ltr">
            {user ? user.email : folder}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="me-2 h-4 w-4" />
          <span>{t("nav.settings")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/liked")} className="cursor-pointer">
          <Heart className="me-2 h-4 w-4" />
          <span>{t("nav.liked")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
          className="cursor-pointer"
        >
          {dark ? <Sun className="me-2 h-4 w-4" /> : <Moon className="me-2 h-4 w-4" />}
          <span>{dark ? t("settings.theme.light") : t("settings.theme.dark")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSettings({ language: settings.language === "ar" ? "en" : "ar" })}
          className="cursor-pointer"
        >
          <span className="me-2 text-xs font-bold">{settings.language === "ar" ? "EN" : "ع"}</span>
          <span>{settings.language === "ar" ? "English" : "العربية"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem onClick={() => void signOut()} className="cursor-pointer text-destructive">
            <LogOut className="me-2 h-4 w-4" />
            <span>{t("common.signOut")}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => navigate("/auth")} className="cursor-pointer">
            <LogIn className="me-2 h-4 w-4" />
            <span>{t("common.signIn")}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
