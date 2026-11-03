import { Link, useLocation } from "react-router-dom";
import { Loader2, Pause, Play, Radio as RadioIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRadio } from "@/context/RadioProvider";
import { useSession } from "@/context/SessionProvider";

/** Floating "now playing" bar shown on every page except the Radio page itself. */
export function RadioBar() {
  const { station, state, toggle, stop } = useRadio();
  const { settings } = useSession();
  const { pathname } = useLocation();
  if (!station || pathname === "/radio" || pathname === "/scrolling") return null;
  const ar = settings.language === "ar";
  const status =
    state === "loading" ? (ar ? "جارٍ الاتصال…" : "Connecting…")
    : state === "error" ? (ar ? "تعذّر التشغيل" : "Can't play")
    : state === "paused" ? (ar ? "متوقف" : "Paused")
    : (ar ? "بث مباشر" : "Live");

  return (
    <div className="fixed bottom-20 start-3 z-40 flex w-[min(320px,calc(100vw-1.5rem))] items-center gap-2 rounded-xl bg-card p-2 shadow-2xl ring-1 ring-border animate-in fade-in slide-in-from-bottom-4 md:bottom-4">
      <Link to="/radio" className="flex min-w-0 flex-1 items-center gap-2" aria-label={ar ? "فتح الراديو" : "Open radio"}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <RadioIcon className={state === "playing" ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{station.name}</span>
          <span className={state === "error" ? "block text-xs text-destructive" : "block text-xs text-muted-foreground"}>{status}</span>
        </span>
      </Link>
      <Button size="icon" variant="secondary" onClick={toggle} aria-label={state === "playing" ? (ar ? "إيقاف مؤقت" : "Pause") : (ar ? "تشغيل" : "Play")}>
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={stop} aria-label={ar ? "إغلاق الراديو" : "Close radio"}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
