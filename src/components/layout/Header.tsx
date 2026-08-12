import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/UserMenu";
import { Bell, Menu, Search, Upload, X, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-youtube-border bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      {/* بحث الجوال بملء الشاشة */}
      {mobileSearch ? (
        <form onSubmit={submit} className="flex w-full items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileSearch(false)}
            aria-label="إغلاق البحث"
          >
            <X className="h-5 w-5" />
          </Button>
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المكتبة..."
            className="h-10 flex-1 rounded-full bg-secondary"
          />
          <Button type="submit" size="icon" variant="secondary" className="rounded-full" aria-label="بحث">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              aria-label="القائمة"
              className="hover:bg-secondary"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-secondary"
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-youtube-red text-primary-foreground">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <span className="hidden text-base font-extrabold tracking-tight sm:block">
                مكتبتي
              </span>
            </button>
          </div>

          {/* بحث سطح المكتب */}
          <form onSubmit={submit} className="mx-auto hidden w-full max-w-xl flex-1 items-center md:flex">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المكتبة..."
              className="h-10 rounded-e-none rounded-s-full border-e-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-10 rounded-s-none rounded-e-full border-s-0 px-5 hover:bg-youtube-light-gray"
              aria-label="بحث"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <div className={cn("flex shrink-0 items-center gap-0.5 sm:gap-1", "ms-auto md:ms-0")}>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSearch(true)}
              aria-label="بحث"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-secondary" aria-label="إضافة مجلد">
              <Upload className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden xs:flex hover:bg-secondary" aria-label="التنبيهات">
              <Bell className="h-5 w-5" />
            </Button>
            <UserMenu />
          </div>
        </>
      )}
    </header>
  );
}
