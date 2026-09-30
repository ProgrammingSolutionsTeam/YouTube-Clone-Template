import { useEffect, useState } from "react";
import { Check, Copy, Mail, Send, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/lib/core/types";
import { publicOrigin } from "@/lib/share/network";
import { useSession } from "@/context/SessionProvider";
import { cn } from "@/lib/utils";

type Target = { key: string; label: string; className: string; href: (url: string, text: string) => string; glyph: string };

const TARGETS: Target[] = [
  { key: "whatsapp", label: "WhatsApp", glyph: "W", className: "bg-[hsl(142_70%_40%)]", href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}` },
  {
    key: "messenger",
    label: "Messenger",
    glyph: "M",
    className: "bg-[hsl(214_89%_52%)]",
    href: (u) =>
      /android|iphone|ipad/i.test(navigator.userAgent)
        ? `fb-messenger://share/?link=${encodeURIComponent(u)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  { key: "telegram", label: "Telegram", glyph: "T", className: "bg-[hsl(200_80%_48%)]", href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "x", label: "X", glyph: "X", className: "bg-foreground text-background", href: (u, t) => `https://x.com/intent/post?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
];

export function ShareDialog({ item, open, onOpenChange }: { item: MediaItem; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useSession();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    let alive = true;
    void publicOrigin().then((origin) => alive && setUrl(`${origin}/?v=${encodeURIComponent(item.id)}`));
    return () => {
      alive = false;
    };
  }, [open, item.id]);

  const text = `${item.title} — LocalTube`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.getElementById("share-url") as HTMLInputElement | null;
      field?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription className="line-clamp-2">{item.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap justify-center gap-4 py-2">
          {TARGETS.map((target) => (
            <a
              key={target.key}
              href={url ? target.href(url, text) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-16 flex-col items-center gap-1.5 text-xs"
            >
              <span
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full text-lg font-bold text-primary-foreground shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:scale-105",
                  target.className,
                )}
              >
                {target.glyph}
              </span>
              {target.label}
            </a>
          ))}
          <a href={url ? `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}` : undefined} className="group flex w-16 flex-col items-center gap-1.5 text-xs">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:scale-105">
              <Mail className="h-5 w-5" />
            </span>
            {t("share.email")}
          </a>
          {typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={() => void navigator.share({ title: text, url }).catch(() => undefined)}
              className="group flex w-16 flex-col items-center gap-1.5 text-xs"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:scale-105">
                <Share2 className="h-5 w-5" />
              </span>
              {t("share.more")}
            </button>
          )}
        </div>

        <div className="flex gap-2" dir="ltr">
          <Input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <Button onClick={() => void copy()} className="shrink-0 bg-youtube-red hover:bg-youtube-red/90" disabled={!url}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("share.lanHint")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
