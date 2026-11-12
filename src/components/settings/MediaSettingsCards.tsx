/** Settings cards: audio (equalizer + boost + background) and Scrolling (shorts). */
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Check, RotateCcw, SlidersVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/context/SessionProvider";
import { EQ_FREQUENCIES, EQ_PRESETS } from "@/lib/vault/settings";
import { clearSeen } from "@/lib/media/shorts";
import { resumeAudio } from "@/lib/media/audioEngine";
import { useToast } from "@/hooks/use-toast";

export function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * Slider that moves smoothly while dragging and saves once on release, so a drag
 * is one encrypted write instead of dozens.
 */
export function CommitSlider({
  value, onCommit, className, ...rest
}: Omit<ComponentProps<typeof Slider>, "value" | "onValueChange" | "onValueCommit"> & { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Slider
      {...rest}
      className={className}
      value={[draft]}
      onValueChange={([v]) => setDraft(v)}
      onValueCommit={([v]) => onCommit(v)}
    />
  );
}

const fLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));

function useSavedFlash() {
  const [savedAt, setSavedAt] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const id = window.setTimeout(() => setSavedAt(0), 2200);
    return () => window.clearTimeout(id);
  }, [savedAt]);
  return [savedAt > 0, () => setSavedAt(Date.now())] as const;
}

export function AudioSettingsCard() {
  const { t, settings, updateSettings } = useSession();
  const { toast } = useToast();
  const p = settings.player;
  const ar = settings.language === "ar";
  const [bands, setBands] = useState<number[]>(p.eqBands);
  const [saved, flash] = useSavedFlash();
  useEffect(() => setBands(p.eqBands), [p.eqBands]);

  const save = async (patch: Parameters<typeof updateSettings>[0]["player"]) => {
    resumeAudio();
    try { await updateSettings({ player: patch }); flash(); }
    catch { setBands(p.eqBands); toast({ title: ar ? "تعذر الحفظ، حاول مرة أخرى" : "Couldn't save. Try again.", variant: "destructive" }); }
  };

  const moveBand = (index: number, value: number) =>
    setBands((prev) => prev.map((b, i) => (i === index ? value : b)));
  const commitBand = (index: number, value: number) => {
    const next = bands.map((b, i) => (i === index ? value : b));
    void save({ eqBands: next, eqPreset: matchPreset(next), eqEnabled: true });
  };
  const nudge = (index: number, delta: number) => {
    const next = bands.map((b, i) => (i === index ? Math.max(-12, Math.min(12, b + delta)) : b));
    setBands(next);
    void save({ eqBands: next, eqPreset: matchPreset(next), eqEnabled: true });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg"><SlidersVertical className="h-5 w-5" />{t("eq.title")}</CardTitle>
          <CardDescription>{t("eq.hint")}</CardDescription>
        </div>
        <span
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
            saved ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {saved ? (ar ? "تم الحفظ" : "Saved") : ar ? "يُحفظ تلقائيًا" : "Saves automatically"}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="divide-y divide-border">
          <Row label={t("player.background")} hint={t("player.backgroundHint")}>
            <Switch checked={p.backgroundPlay} onCheckedChange={(v) => void save({ backgroundPlay: v })} />
          </Row>
          <Row label={t("eq.boost")} hint={`${Math.round(p.boost * 100)}%`}>
            <div className="w-[220px]">
              <CommitSlider min={1} max={2} step={0.05} value={p.boost} onCommit={(v) => void save({ boost: v })} aria-label={t("eq.boost")} />
            </div>
          </Row>
          <Row label={t("eq.limiter")} hint={t("eq.limiterHint")}>
            <Switch checked={p.limiter} onCheckedChange={(v) => void save({ limiter: v })} />
          </Row>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-3 sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-base font-semibold">
              <Switch checked={p.eqEnabled} onCheckedChange={(v) => void save({ eqEnabled: v })} />
              {t("eq.enable")}
            </label>
            <Button variant="outline" size="sm" onClick={() => { setBands([...EQ_PRESETS.flat]); void save({ eqPreset: "flat", eqBands: [...EQ_PRESETS.flat] }); }}>
              <RotateCcw className="me-2 h-4 w-4" />{t("eq.reset")}
            </Button>
          </div>

          <div className="mb-2 text-sm font-medium">{t("eq.presetLabel")}</div>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[...Object.keys(EQ_PRESETS), "custom"].map((key) => {
              const active = p.eqEnabled && p.eqPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={key === "custom"}
                  onClick={() => { setBands([...EQ_PRESETS[key]]); void save({ eqPreset: key, eqEnabled: true, eqBands: [...EQ_PRESETS[key]] }); }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
                    key === "custom" && !active && "cursor-default opacity-60 hover:border-border hover:bg-background",
                  )}
                  aria-pressed={active}
                >
                  {t(`eq.preset.${key}`)}
                </button>
              );
            })}
          </div>

          <div className={cn("-mx-1 flex gap-1.5 overflow-x-auto px-1 transition-opacity sm:gap-2", !p.eqEnabled && "opacity-50")} dir="ltr">
            <div className="flex h-56 flex-col justify-between py-7 text-[10px] tabular-nums text-muted-foreground">
              <span>+12</span><span>0</span><span>-12</span>
            </div>
            <div className="relative flex min-w-[260px] flex-1 justify-between gap-0.5 sm:gap-1">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
              {EQ_FREQUENCIES.map((f, i) => (
                <div key={f} className="relative flex flex-1 flex-col items-center">
                  <button type="button" onClick={() => nudge(i, 1)} className="text-[11px] font-semibold tabular-nums text-foreground hover:text-primary" aria-label={`${fLabel(f)} Hz +1 dB`}>
                    {bands[i] > 0 ? "+" : ""}{bands[i] ?? 0}
                  </button>
                  <div className="my-1.5 flex h-44 justify-center">
                    <Slider
                      orientation="vertical"
                      min={-12}
                      max={12}
                      step={1}
                      value={[bands[i] ?? 0]}
                      onValueChange={([v]) => moveBand(i, v)}
                      onValueCommit={([v]) => commitBand(i, v)}
                      className="cursor-pointer"
                      aria-label={`${fLabel(f)} Hz`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{fLabel(f)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ar ? "اسحب كل شريط للأعلى لرفع هذا النطاق وللأسفل لخفضه. التغيير يُحفظ ويُطبَّق فور إفلات الشريط."
                : "Drag a bar up to raise that band, down to lower it. Changes are saved and applied as soon as you let go."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function matchPreset(bands: number[]): string {
  return Object.keys(EQ_PRESETS).find((k) => EQ_PRESETS[k].every((v, i) => v === bands[i])) ?? "custom";
}

export function ShortsSettingsCard() {
  const { t, settings, updateSettings } = useSession();
  const { toast } = useToast();
  const s = settings.shorts;
  const set = (patch: Partial<typeof s>) => void updateSettings({ shorts: patch });
  const toggle = (key: keyof typeof s, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Switch checked={Boolean(s[key])} onCheckedChange={(v) => set({ [key]: v } as Partial<typeof s>)} />
    </Row>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("nav.scrolling")}</CardTitle>
        <CardDescription>{t("shorts.settingsHint")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <Row label={t("shorts.maxDuration")} hint={`${s.maxDuration}s`}>
          <div className="w-[220px]">
            <CommitSlider min={15} max={300} step={5} value={s.maxDuration} onCommit={(v) => set({ maxDuration: v })} aria-label={t("shorts.maxDuration")} />
          </div>
        </Row>
        <Row label={t("shorts.maxSize")} hint={`${s.maxSizeMB} MB`}>
          <div className="w-[220px]">
            <CommitSlider min={5} max={500} step={5} value={s.maxSizeMB} onCommit={(v) => set({ maxSizeMB: v })} aria-label={t("shorts.maxSize")} />
          </div>
        </Row>
        {toggle("verticalOnly", t("shorts.verticalOnly"), t("shorts.verticalOnlyHint"))}
        {toggle("shuffle", t("shorts.shuffle"))}
        {toggle("avoidRepeats", t("shorts.avoidRepeats"))}
        {toggle("autoScroll", t("shorts.autoScroll"))}
        {toggle("loop", t("shorts.loop"))}
        {toggle("startMuted", t("shorts.startMuted"))}
        {toggle("doubleTapLike", t("shorts.doubleTap"))}
        {toggle("holdToPause", t("shorts.hold"))}
        {toggle("showProgress", t("shorts.progress"))}
        {toggle("showInfo", t("shorts.info"))}
        {toggle("preloadNext", t("shorts.preload"))}
        <Row label={t("shorts.fit")}>
          <Select value={s.fit} onValueChange={(v) => set({ fit: v as "cover" | "contain" })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">{t("shorts.fit.cover")}</SelectItem>
              <SelectItem value="contain">{t("shorts.fit.contain")}</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label={t("player.speed")}>
          <Select value={String(s.speed)} onValueChange={(v) => set({ speed: Number(v) })}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0.5, 1, 1.25, 1.5, 2].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label={t("shorts.clearSeen")}>
          <Button variant="secondary" size="sm" onClick={() => (clearSeen(), toast({ title: t("shorts.cleared") }))}>
            {t("shorts.clear")}
          </Button>
        </Row>
      </CardContent>
    </Card>
  );
}

export const REFRESH_OPTIONS = [0, 1, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440];
