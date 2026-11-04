import { useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, Pause, Play, Plus, Radio as RadioIcon, Search, Trash2, Volume2 } from "lucide-react";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { useRadio, type PlayableStation } from "@/context/RadioProvider";
import { randomId } from "@/lib/core/ids";
import {
  RADIO_CATEGORIES, SUGGESTED_STATIONS, addStation, blockedByHttps, flag, normalizeStationUrl, sameStream,
  type RadioCategory,
} from "@/lib/radio/stations";
import { cn } from "@/lib/utils";

const Radio = () => {
  const { settings, updateSettings } = useSession();
  const radio = useRadio();
  const { toast } = useToast();
  const ar = settings.language === "ar";
  const L = (a: string, e: string) => (ar ? a : e);
  const stations = settings.radio.stations;

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<RadioCategory | "all">("all");
  const [query, setQuery] = useState("");

  const saveList = (list: typeof stations) => updateSettings({ radio: { stations: list } as never });

  const checkUrl = () => {
    const r = normalizeStationUrl(url);
    if ("reason" in r) {
      setError(r.reason === "empty" ? L("أدخل رابط البث", "Enter the stream link")
        : r.reason === "protocol" ? L("الرابط يجب أن يبدأ بـ http أو https", "The link must start with http or https")
        : L("الرابط غير صحيح", "That link isn't valid"));
      return null;
    }
    setError(null);
    return (r as { url: string }).url;
  };

  const add = async () => {
    const clean = checkUrl();
    if (!clean) return;
    if (stations.some((s) => sameStream(s.url, clean))) {
      setError(L("هذه المحطة موجودة في قائمتك", "This station is already in your list"));
      return;
    }
    await saveList(addStation(stations, { name: name || new URL(clean).hostname, url: clean, category: "custom" }, randomId()));
    setName(""); setUrl("");
    toast({ title: L("تمت إضافة المحطة", "Station added") });
  };

  const tryIt = () => {
    const clean = checkUrl();
    if (clean) radio.play({ name: name || new URL(clean).hostname, url: clean });
  };

  const addSuggested = async (s: (typeof SUGGESTED_STATIONS)[number]) => {
    await saveList(addStation(stations, { name: s.name, url: s.url, category: s.category, country: s.country }, randomId()));
    toast({ title: L(`أُضيفت ${s.name}`, `${s.name} added`) });
  };

  const remove = async (id: string) => {
    const st = stations.find((s) => s.id === id);
    if (st && radio.station && sameStream(radio.station.url, st.url)) radio.stop();
    await saveList(stations.filter((s) => s.id !== id));
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUGGESTED_STATIONS.filter((s) =>
      (category === "all" || s.category === category) &&
      (!q || `${s.name} ${s.tags} ${s.country}`.toLowerCase().includes(q)));
  }, [category, query]);

  const isCurrent = (u: string) => Boolean(radio.station && sameStream(radio.station.url, u));
  const playBtn = (st: PlayableStation, size: "icon" | "lg" = "icon") => {
    const current = isCurrent(st.url);
    const playing = current && radio.state === "playing";
    const loading = current && radio.state === "loading";
    return (
      <Button
        size={size === "lg" ? "lg" : "icon"}
        variant={current ? "default" : "secondary"}
        className={cn("shrink-0 rounded-full", size === "lg" && "h-14 w-14 p-0")}
        onClick={() => (current ? radio.toggle() : radio.play(st))}
        aria-label={playing ? L("إيقاف مؤقت", "Pause") : L(`تشغيل ${st.name}`, `Play ${st.name}`)}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
    );
  };

  const status =
    radio.state === "loading" ? L("جارٍ الاتصال بالمحطة…", "Connecting to the station…")
    : radio.state === "playing" ? L("بث مباشر الآن", "Live now")
    : radio.state === "paused" ? L("متوقف مؤقتًا", "Paused")
    : radio.state === "error" ? L("تعذّر تشغيل هذا الرابط. تأكد أنه رابط بث صوتي مباشر (mp3 / aac).", "This link didn't play. Make sure it's a direct audio stream (mp3 / aac).")
    : "";

  return (
    <AppLayout>
      <PageHeading
        title={L("الراديو", "Radio")}
        description={L("أضف روابط محطاتك المفضلة أو اختر من المحطات المقترحة واستمع مباشرة.", "Add links to your favourite stations or pick a suggestion and listen live.")}
      />

      {/* now playing */}
      <Card className="mb-5 overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-4 bg-gradient-to-br from-primary/15 via-transparent to-transparent p-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary">
            <RadioIcon className={cn("h-8 w-8", radio.state === "playing" && "animate-pulse")} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{L("يعمل الآن", "Now playing")}</div>
            <div className="truncate text-xl font-bold">{radio.station?.name ?? L("لا توجد محطة", "Nothing playing")}</div>
            {status && <div className={cn("text-sm", radio.state === "error" ? "text-destructive" : "text-muted-foreground")}>{status}</div>}
          </div>
          {radio.station && playBtn(radio.station, "lg")}
          <div className="flex w-full items-center gap-3 sm:w-56">
            <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Slider min={0} max={1} step={0.01} value={[radio.volume]} onValueChange={([v]) => radio.setVolume(v)} aria-label={L("مستوى الصوت", "Volume")} />
            <span className="w-10 text-end text-xs tabular-nums text-muted-foreground">{Math.round(radio.volume * 100)}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* my stations + add */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{L("إضافة محطة", "Add a station")}</CardTitle>
              <CardDescription>{L("الصق رابط البث المباشر (ينتهي غالبًا بـ mp3 أو aac أو stream).", "Paste the live stream link (often ends in mp3, aac or stream).")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="radio-name">{L("اسم المحطة", "Station name")}</Label>
                <Input id="radio-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={L("مثال: إذاعتي المفضلة", "e.g. My favourite FM")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="radio-url">{L("رابط البث", "Stream link")}</Label>
                <Input id="radio-url" dir="ltr" value={url} onChange={(e) => { setUrl(e.target.value); setError(null); }} placeholder="https://example.com/live.mp3"
                  onKeyDown={(e) => e.key === "Enter" && void add()} />
              </div>
              {error && <p className="flex items-center gap-1.5 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</p>}
              {!error && url && blockedByHttps(url.trim(), window.location.protocol) && (
                <p className="text-xs text-muted-foreground">{L("روابط http قد لا تعمل عند فتح التطبيق عبر https.", "http links may not play while the app is opened over https.")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void add()}><Plus className="me-2 h-4 w-4" />{L("حفظ المحطة", "Save station")}</Button>
                <Button variant="outline" onClick={tryIt}><Play className="me-2 h-4 w-4" />{L("تجربة", "Try it")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{L("محطاتي", "My stations")} <span className="text-sm font-normal text-muted-foreground">({stations.length})</span></CardTitle>
            </CardHeader>
            <CardContent>
              {stations.length === 0 ? (
                <p className="rounded-lg bg-secondary/60 p-4 text-sm text-muted-foreground">
                  {L("لم تضف محطات بعد. أضف رابطًا أو اضغط + على أي محطة مقترحة.", "No stations yet. Add a link or press + on any suggestion.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {stations.map((st) => (
                    <li key={st.id} className={cn("flex items-center gap-3 rounded-xl border p-2.5 transition-colors", isCurrent(st.url) ? "border-primary bg-primary/10" : "border-border bg-secondary/30")}>
                      {playBtn(st)}
                      <span className="text-xl" aria-hidden>{flag(st.country ?? "")}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{st.name}</div>
                        <div className="truncate text-xs text-muted-foreground" dir="ltr">{st.url}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => void remove(st.id)} aria-label={L(`حذف ${st.name}`, `Remove ${st.name}`)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{L("محطات مقترحة", "Suggested stations")}</CardTitle>
            <CardDescription>{L("محطات عربية وعالمية، أغاني وأخبار. استمع أولًا أو أضفها لقائمتك بضغطة.", "Arabic and world stations, music and news. Listen first or add with one tap.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L("ابحث عن محطة…", "Search stations…")} className="ps-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ key: "all" as const, ar: "الكل", en: "All" }, ...RADIO_CATEGORIES].map((c) => (
                <Button key={c.key} size="sm" variant={category === c.key ? "default" : "secondary"} className="rounded-full" onClick={() => setCategory(c.key)}>
                  {ar ? c.ar : c.en}
                </Button>
              ))}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => {
                const saved = stations.some((st) => sameStream(st.url, s.url));
                return (
                  <li key={s.url} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors", isCurrent(s.url) ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50")}>
                    {playBtn(s)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground"><span aria-hidden>{flag(s.country)}</span> {s.tags}</div>
                    </div>
                    <Button size="icon" variant={saved ? "ghost" : "outline"} disabled={saved} onClick={() => void addSuggested(s)}
                      aria-label={saved ? L("مضافة", "Added") : L(`إضافة ${s.name}`, `Add ${s.name}`)}>
                      {saved ? <Check className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {suggestions.length === 0 && <p className="text-sm text-muted-foreground">{L("لا توجد نتائج", "No matches")}</p>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Radio;
