/** Settings cards: audio (equalizer + boost + background) and Scrolling (shorts). */
import type { ReactNode } from "react";
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

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const fLabel = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));

export function AudioSettingsCard() {
  const { t, settings, updateSettings } = useSession();
  const p = settings.player;

  const setBand = (index: number, value: number) => {
    const bands = [...p.eqBands];
    bands[index] = value;
    resumeAudio();
    void updateSettings({ player: { eqBands: bands, eqPreset: "custom", eqEnabled: true } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("eq.title")}</CardTitle>
        <CardDescription>{t("eq.hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="divide-y divide-border">
          <Row label={t("player.background")} hint={t("player.backgroundHint")}>
            <Switch checked={p.backgroundPlay} onCheckedChange={(v) => void updateSettings({ player: { backgroundPlay: v } })} />
          </Row>
          <Row label={t("eq.boost")} hint={`${Math.round(p.boost * 100)}%`}>
            <div className="w-[180px]">
              <Slider min={1} max={2} step={0.05} value={[p.boost]} onValueChange={([v]) => void updateSettings({ player: { boost: v } })} />
            </div>
          </Row>
          <Row label={t("eq.limiter")} hint={t("eq.limiterHint")}>
            <Switch checked={p.limiter} onCheckedChange={(v) => void updateSettings({ player: { limiter: v } })} />
          </Row>
          <Row label={t("eq.enable")}>
            <Switch checked={p.eqEnabled} onCheckedChange={(v) => (resumeAudio(), void updateSettings({ player: { eqEnabled: v } }))} />
          </Row>
          <Row label={t("eq.presetLabel")}>
            <Select
              value={p.eqPreset}
              onValueChange={(key) =>
                key !== "custom" && void updateSettings({ player: { eqPreset: key, eqEnabled: true, eqBands: [...EQ_PRESETS[key]] } })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(EQ_PRESETS).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`eq.preset.${key}`)}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t("eq.preset.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </div>

        <div className="flex items-end justify-between gap-1 rounded-xl bg-secondary/50 p-3 sm:gap-3" dir="ltr">
          {EQ_FREQUENCIES.map((f, i) => (
            <div key={f} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">{p.eqBands[i] > 0 ? "+" : ""}{p.eqBands[i]}</span>
              <Slider
                orientation="vertical"
                min={-12}
                max={12}
                step={1}
                value={[p.eqBands[i] ?? 0]}
                onValueChange={([v]) => setBand(i, v)}
                className="h-36"
                aria-label={`${fLabel(f)} Hz`}
                disabled={!p.eqEnabled}
              />
              <span className="text-[10px] text-muted-foreground">{fLabel(f)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => void updateSettings({ player: { eqPreset: "flat", eqBands: [...EQ_PRESETS.flat] } })}>
            {t("eq.reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
          <div className="w-[180px]">
            <Slider min={15} max={300} step={5} value={[s.maxDuration]} onValueChange={([v]) => set({ maxDuration: v })} />
          </div>
        </Row>
        <Row label={t("shorts.maxSize")} hint={`${s.maxSizeMB} MB`}>
          <div className="w-[180px]">
            <Slider min={5} max={500} step={5} value={[s.maxSizeMB]} onValueChange={([v]) => set({ maxSizeMB: v })} />
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
