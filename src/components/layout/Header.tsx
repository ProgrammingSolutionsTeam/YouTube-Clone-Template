import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/UserMenu";
import { Menu, Play, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const navigate = useNavigate();
  const { t } = useSession();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setMobileSearch(false);
    }
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-youtube-border bg-background/95 px-2 backdrop-blur sm:px-4">
      {mobileSearch ? (
        <form onSubmit={submit} className="flex w-full items-center gap-2 md:hidden">
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileSearch(false)}>
            <X className="h-5 w-5" />
          </Button>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="h-9 flex-1 rounded-full"
          />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="h-5 w-5" />
          </Button>
        </form>
      ) : (
        <>
          <Button variant="ghost" size="icon" onClick={onMenuToggle} aria-label={t("nav.explore")}>
            <Menu className="h-5 w-5" />
          </Button>

          <button
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center gap-1.5 text-base font-extrabold tracking-tight sm:text-lg"
          >
            <span className="grid h-6 w-8 place-items-center rounded bg-youtube-red">
              <Play className="h-3.5 w-3.5 fill-primary-foreground text-primary-foreground" />
            </span>
            <span className="hidden xs:inline">{t("app.name")}</span>
          </button>

          <form onSubmit={submit} className="mx-auto hidden w-full max-w-xl items-center gap-2 md:flex">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.searchPlaceholder")}
              className="h-9 rounded-full bg-secondary/60"
            />
            <Button type="submit" size="icon" variant="secondary" className="shrink-0 rounded-full">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className="ms-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSearch(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <UserMenu />
          </div>
        </>
      )}
    </header>
  );
}
