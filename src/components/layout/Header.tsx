import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/UserMenu";
import { Menu, Play, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionProvider";
import { locationOf, rootKeyMap, searchLibrary } from "@/lib/media/library";
import { watchHref } from "@/lib/core/paths";
import type { MediaItem } from "@/lib/core/types";

interface HeaderProps {
  onMenuToggle: () => void;
}

interface Suggestion {
  id: string;
  title: string;
  channel: string;
  href: string;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const { t } = useSession();
  const boxRef = useRef<HTMLDivElement>(null);

  /* live suggestions, debounced so typing never blocks the UI */
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const [items, keys] = await Promise.all([searchLibrary(value, 8), rootKeyMap()]);
        if (cancelled) return;
        setSuggestions(
          items.map((item: MediaItem) => ({
            id: item.id,
            title: item.title,
            channel: item.channel,
            href: watchHref(locationOf(item, keys.get(item.rootId))),
          })),
        );
        setActive(-1);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToSearch = useCallback(() => {
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    setMobileSearch(false);
    navigate(`/search?q=${encodeURIComponent(value)}`);
  }, [navigate, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) {
      setOpen(false);
      setMobileSearch(false);
      navigate(suggestions[active].href);
      return;
    }
    goToSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const SearchField = ({ autoFocus = false }: { autoFocus?: boolean }) => (
    <Input
      autoFocus={autoFocus}
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={onKeyDown}
      placeholder={t("common.searchPlaceholder")}
      aria-label={t("common.search")}
      className="h-9 flex-1 rounded-full bg-secondary/60"
    />
  );

  const Suggestions = () =>
    open && suggestions.length > 0 ? (
      <ul className="absolute inset-x-0 top-11 z-50 max-h-80 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
        {suggestions.map((s, index) => (
          <li key={s.id}>
            <button
              type="button"
              onMouseEnter={() => setActive(index)}
              onClick={() => {
                setOpen(false);
                setMobileSearch(false);
                navigate(s.href);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm ${
                index === active ? "bg-accent" : "hover:bg-accent"
              }`}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">{s.channel}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={goToSearch}
            className="w-full rounded-lg px-3 py-2 text-start text-xs font-semibold text-muted-foreground hover:bg-accent"
          >
            {t("search.seeAll")}
          </button>
        </li>
      </ul>
    ) : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-youtube-border bg-background/95 px-2 backdrop-blur sm:px-4">
      {mobileSearch ? (
        <form onSubmit={submit} className="relative flex w-full items-center gap-2 md:hidden" ref={boxRef}>
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileSearch(false)}>
            <X className="h-5 w-5" />
          </Button>
          <SearchField autoFocus />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="h-5 w-5" />
          </Button>
          <Suggestions />
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

          <div className="mx-auto hidden w-full max-w-xl md:block" ref={boxRef}>
            <form onSubmit={submit} className="relative flex items-center gap-2">
              <SearchField />
              <Button type="submit" size="icon" variant="secondary" className="shrink-0 rounded-full">
                <Search className="h-4 w-4" />
              </Button>
              <Suggestions />
            </form>
          </div>

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
