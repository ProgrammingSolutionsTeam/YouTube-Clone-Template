import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Check,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionProvider";
import { ACCENTS } from "@/lib/vault/settings";
import { pickDirectory, supportsDirectoryPicker, ensurePermission, handlePermission } from "@/lib/core/filesystem";
import { rootsStore, resetIndex } from "@/lib/core/indexdb";
import { randomId } from "@/lib/core/ids";
import { scanner } from "@/lib/scanner/scanner";
import { invalidateLibrary, libraryStats } from "@/lib/media/library";
import type { RootRecord, ScanProgress } from "@/lib/core/types";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { t, settings, updateSettings, resetSettings, user, folder, updateAccount, exportData, wipeEverything } =
    useSession();
  const { toast } = useToast();

  const [roots, setRoots] = useState<RootRecord[]>([]);
  const [grants, setGrants] = useState<Record<string, boolean>>({});
  const [rootKey, setRootKey] = useState("");
  const [displayPath, setDisplayPath] = useState("");
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [stats, setStats] = useState<{ items: number; roots: number; channels: number } | null>(null);

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const refresh = async () => {
    const rows = await rootsStore.all();
    setRoots(rows);
    const states: Record<string, boolean> = {};
    for (const row of rows) states[row.id] = (await handlePermission(row.handle)) === "granted";
    setGrants(states);
    setStats(await libraryStats());
  };

  useEffect(() => {
    void refresh();
    return scanner.subscribe(setProgress);
  }, []);

  useEffect(() => {
    setName(user?.displayName ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  /* ------------------------------------------------------------------ roots */

  const pick = async () => {
    if (!supportsDirectoryPicker()) {
      toast({ title: t("roots.unsupported"), variant: "destructive" });
      return;
    }
    try {
      const picked = await pickDirectory();
      setHandle(picked);
      if (!displayPath) setDisplayPath(picked.name);
      if (!rootKey) setRootKey(picked.name.replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 12) || "root");
    } catch {
      /* cancelled */
    }
  };

  const addRoot = async () => {
    const key = rootKey.trim();
    if (!key || !handle) {
      toast({ title: t("roots.pickFirst"), variant: "destructive" });
      return;
    }
    if (roots.some((r) => r.name.toLowerCase() === key.toLowerCase())) {
      toast({ title: t("roots.dupKey"), variant: "destructive" });
      return;
    }
    const record: RootRecord = {
      id: randomId(),
      name: key,
      displayPath: displayPath.trim() || handle.name,
      handle,
      createdAt: Date.now(),
    };
    await rootsStore.put(record);
    invalidateLibrary();
    setRootKey("");
    setDisplayPath("");
    setHandle(null);
    await refresh();
    toast({ title: t("roots.added"), description: `root=${key}` });
    void scanner.enqueue(record, "full", settings.scanner.deepDetect).then(refresh);
  };

  const rescan = async (root: RootRecord) => {
    if (!(await ensurePermission(root.handle))) {
      toast({ title: t("roots.needsGrant"), variant: "destructive" });
      return;
    }
    invalidateLibrary();
    await scanner.enqueue(root, "incremental", settings.scanner.deepDetect);
    invalidateLibrary();
    await refresh();
  };

  const removeRoot = async (root: RootRecord) => {
    await rootsStore.remove(root.id);
    invalidateLibrary();
    await refresh();
  };

  /* ---------------------------------------------------------------- account */

  const saveAccount = async () => {
    try {
      await updateAccount({
        displayName: name,
        email,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: t("account.updated") });
    } catch (error) {
      toast({ title: t(error instanceof Error ? error.message : "account.wrongPassword"), variant: "destructive" });
    }
  };

  const download = async () => {
    const json = await exportData();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "my-library-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <PageHeading title={t("settings.title")} description={t("settings.subtitle")} />

        <Tabs defaultValue="general">
          <TabsList className="mb-5 w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">{t("settings.tab.general")}</TabsTrigger>
            <TabsTrigger value="roots">{t("settings.tab.roots")}</TabsTrigger>
            <TabsTrigger value="player">{t("settings.tab.player")}</TabsTrigger>
            <TabsTrigger value="library">{t("settings.tab.library")}</TabsTrigger>
            <TabsTrigger value="privacy">{t("settings.tab.privacy")}</TabsTrigger>
            <TabsTrigger value="account">{t("settings.tab.account")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("settings.tab.advanced")}</TabsTrigger>
          </TabsList>

          {/* ----------------------------------------------------- general */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.general")}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <Row label={t("settings.language")}>
                  <Select
                    value={settings.language}
                    onValueChange={(v) => void updateSettings({ language: v as "ar" | "en" })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("settings.theme")}>
                  <Select
                    value={settings.theme}
                    onValueChange={(v) => void updateSettings({ theme: v as "light" | "dark" | "system" })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
                      <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
                      <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <div className="py-3">
                  <div className="mb-2 text-sm font-medium">{t("settings.accent")}</div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((accent) => (
                      <button
                        key={accent.key}
                        onClick={() => void updateSettings({ accent: accent.key })}
                        title={settings.language === "ar" ? accent.labelAr : accent.labelEn}
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-background transition",
                          settings.accent === accent.key && "ring-2 ring-foreground",
                        )}
                        style={{ backgroundColor: `hsl(${accent.hsl})` }}
                      >
                        {settings.accent === accent.key && <Check className="h-4 w-4 text-primary-foreground" />}
                      </button>
                    ))}
                  </div>
                </div>
                <Row label={t("settings.fontScale")} hint={`${Math.round(settings.fontScale * 100)}%`}>
                  <div className="w-[180px]">
                    <Slider
                      min={0.85}
                      max={1.3}
                      step={0.05}
                      value={[settings.fontScale]}
                      onValueChange={([v]) => void updateSettings({ fontScale: v })}
                    />
                  </div>
                </Row>
                <Row label={t("settings.reduceMotion")}>
                  <Switch
                    checked={settings.reduceMotion}
                    onCheckedChange={(v) => void updateSettings({ reduceMotion: v })}
                  />
                </Row>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------- roots */}
          <TabsContent value="roots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderOpen className="h-5 w-5" />
                  {t("roots.title")}
                </CardTitle>
                <CardDescription>{t("roots.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="root-key">{t("roots.key")}</Label>
                    <Input
                      id="root-key"
                      dir="ltr"
                      placeholder="F"
                      value={rootKey}
                      onChange={(e) => setRootKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("roots.keyHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="root-path">{t("roots.path")}</Label>
                    <Input
                      id="root-path"
                      dir="ltr"
                      placeholder="F:\#Videos"
                      value={displayPath}
                      onChange={(e) => setDisplayPath(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("roots.pathHint")}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => void pick()} className="flex-1 sm:flex-none">
                    <FolderOpen className="me-2 h-4 w-4" />
                    {t("common.browseFolder")}
                  </Button>
                  <Button
                    onClick={() => void addRoot()}
                    disabled={!handle}
                    className="flex-1 bg-youtube-red hover:bg-youtube-red/90 sm:flex-none"
                  >
                    <Plus className="me-2 h-4 w-4" />
                    {t("common.add")}
                  </Button>
                  {handle && (
                    <Badge variant="secondary" className="self-center">
                      {t("roots.granted")}: {handle.name}
                    </Badge>
                  )}
                </div>

                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("roots.pickFirst")}
                </p>

                {progress && progress.state === "scanning" && (
                  <div className="rounded-lg bg-secondary/60 p-3 text-xs">
                    <div className="mb-1 font-semibold">
                      {t("common.scanning")} — {progress.rootName}
                    </div>
                    <div className="text-muted-foreground" dir="ltr">
                      {progress.mediaFound} media · {progress.filesSeen} files · {progress.directoriesSeen} dirs
                    </div>
                    <div className="mt-1 truncate text-muted-foreground" dir="ltr">
                      {progress.currentPath}
                    </div>
                  </div>
                )}

                {roots.length > 0 && (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {roots.map((root) => (
                      <li key={root.id} className="flex flex-wrap items-center gap-2 bg-secondary/40 px-3 py-2.5">
                        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" dir="ltr">
                            root={root.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground" dir="ltr">
                            {root.displayPath} · {root.itemCount ?? 0} {t("roots.count")}
                          </div>
                        </div>
                        <Badge variant={grants[root.id] ? "secondary" : "destructive"}>
                          {grants[root.id] ? t("roots.granted") : t("roots.needsGrant")}
                        </Badge>
                        <Button variant="ghost" size="icon" aria-label={t("common.rescan")} onClick={() => void rescan(root)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => void removeRoot(root)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {stats && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {[
                      { value: stats.items, label: t("stats.items") },
                      { value: stats.channels, label: t("stats.channels") },
                      { value: stats.roots, label: t("stats.roots") },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-secondary/60 py-2">
                        <div className="text-base font-bold">{s.value}</div>
                        <div className="text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
                <div className="divide-y divide-border">
                  <Row label={t("scanner.scanOnStartup")}>
                    <Switch
                      checked={settings.scanner.scanOnStartup}
                      onCheckedChange={(v) => void updateSettings({ scanner: { scanOnStartup: v } })}
                    />
                  </Row>
                  <Row label={t("scanner.deepDetect")}>
                    <Switch
                      checked={settings.scanner.deepDetect}
                      onCheckedChange={(v) => void updateSettings({ scanner: { deepDetect: v } })}
                    />
                  </Row>
                  <Row label={t("scanner.thumbnails")}>
                    <Switch
                      checked={settings.scanner.generateThumbnails}
                      onCheckedChange={(v) => void updateSettings({ scanner: { generateThumbnails: v } })}
                    />
                  </Row>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------ player */}
          <TabsContent value="player" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.player")}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <Row label={t("player.volume")} hint={`${Math.round(settings.player.volume * 100)}%`}>
                  <div className="w-[180px]">
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={[settings.player.volume]}
                      onValueChange={([v]) => void updateSettings({ player: { volume: v } })}
                    />
                  </div>
                </Row>
                <Row label={t("player.speed")}>
                  <Select
                    value={String(settings.player.defaultSpeed)}
                    onValueChange={(v) => void updateSettings({ player: { defaultSpeed: Number(v) } })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}×
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("player.resume")}>
                  <Switch
                    checked={settings.player.rememberPosition}
                    onCheckedChange={(v) => void updateSettings({ player: { rememberPosition: v } })}
                  />
                </Row>
                <Row label={t("player.autoplay")}>
                  <Switch
                    checked={settings.player.autoplayNext}
                    onCheckedChange={(v) => void updateSettings({ player: { autoplayNext: v } })}
                  />
                </Row>
                <Row label={t("player.loop")}>
                  <Switch
                    checked={settings.player.loopByDefault}
                    onCheckedChange={(v) => void updateSettings({ player: { loopByDefault: v } })}
                  />
                </Row>
                <Row label={t("player.theater")}>
                  <Switch
                    checked={settings.player.theaterByDefault}
                    onCheckedChange={(v) => void updateSettings({ player: { theaterByDefault: v } })}
                  />
                </Row>
                <Row label={t("player.pip")}>
                  <Switch
                    checked={settings.player.pipEnabled}
                    onCheckedChange={(v) => void updateSettings({ player: { pipEnabled: v } })}
                  />
                </Row>
                <Row label={t("player.subtitles")}>
                  <Switch
                    checked={settings.player.subtitlesEnabled}
                    onCheckedChange={(v) => void updateSettings({ player: { subtitlesEnabled: v } })}
                  />
                </Row>
                <Row label={t("settings.language")} hint={t("player.subtitles")}>
                  <Select
                    value={settings.player.subtitleLanguage}
                    onValueChange={(v) => void updateSettings({ player: { subtitleLanguage: v } })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("player.subtitleDelay")} hint={`${settings.player.subtitleDelay}s`}>
                  <div className="w-[180px]">
                    <Slider
                      min={-10}
                      max={10}
                      step={0.5}
                      value={[settings.player.subtitleDelay]}
                      onValueChange={([v]) => void updateSettings({ player: { subtitleDelay: v } })}
                    />
                  </div>
                </Row>
                <Row label={t("player.seekStep")} hint={`${settings.player.seekStep}s`}>
                  <div className="w-[180px]">
                    <Slider
                      min={1}
                      max={30}
                      step={1}
                      value={[settings.player.seekStep]}
                      onValueChange={([v]) => void updateSettings({ player: { seekStep: v } })}
                    />
                  </div>
                </Row>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------- library */}
          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.library")}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <Row label={t("library.gridDensity")}>
                  <Select
                    value={settings.library.gridDensity}
                    onValueChange={(v) =>
                      void updateSettings({ library: { gridDensity: v as "compact" | "comfortable" | "spacious" } })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">1</SelectItem>
                      <SelectItem value="comfortable">2</SelectItem>
                      <SelectItem value="spacious">3</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("library.showThumbnails")}>
                  <Switch
                    checked={settings.library.showThumbnails}
                    onCheckedChange={(v) => void updateSettings({ library: { showThumbnails: v } })}
                  />
                </Row>
                <Row label={t("library.kindFilter")}>
                  <Select
                    value={settings.library.kindFilter}
                    onValueChange={(v) => void updateSettings({ library: { kindFilter: v as "all" | "video" | "audio" } })}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("home.all")}</SelectItem>
                      <SelectItem value="video">{t("home.video")}</SelectItem>
                      <SelectItem value="audio">{t("home.audio")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("library.sortBy")}>
                  <Select
                    value={settings.library.sortBy}
                    onValueChange={(v) =>
                      void updateSettings({ library: { sortBy: v as "recent" | "title" | "size" | "duration" } })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">{t("library.sort.recent")}</SelectItem>
                      <SelectItem value="title">{t("library.sort.title")}</SelectItem>
                      <SelectItem value="size">{t("library.sort.size")}</SelectItem>
                      <SelectItem value="duration">{t("library.sort.duration")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label={t("library.hideUnavailable")}>
                  <Switch
                    checked={settings.library.hideUnavailable}
                    onCheckedChange={(v) => void updateSettings({ library: { hideUnavailable: v } })}
                  />
                </Row>
                <Row label={t("common.items")} hint={String(settings.library.itemsPerPage)}>
                  <div className="w-[180px]">
                    <Slider
                      min={12}
                      max={200}
                      step={12}
                      value={[settings.library.itemsPerPage]}
                      onValueChange={([v]) => void updateSettings({ library: { itemsPerPage: v } })}
                    />
                  </div>
                </Row>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------- privacy */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.privacy")}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <Row label={t("privacy.saveHistory")}>
                  <Switch
                    checked={settings.privacy.saveHistory}
                    onCheckedChange={(v) => void updateSettings({ privacy: { saveHistory: v } })}
                  />
                </Row>
                <Row label={t("privacy.historyLimit")} hint={String(settings.privacy.historyLimit)}>
                  <div className="w-[180px]">
                    <Slider
                      min={50}
                      max={2000}
                      step={50}
                      value={[settings.privacy.historyLimit]}
                      onValueChange={([v]) => void updateSettings({ privacy: { historyLimit: v } })}
                    />
                  </div>
                </Row>
                <Row label={t("privacy.saveResume")}>
                  <Switch
                    checked={settings.privacy.saveResumePositions}
                    onCheckedChange={(v) => void updateSettings({ privacy: { saveResumePositions: v } })}
                  />
                </Row>
                <Row label={t("privacy.lockOnClose")}>
                  <Switch
                    checked={settings.privacy.lockOnClose}
                    onCheckedChange={(v) => void updateSettings({ privacy: { lockOnClose: v } })}
                  />
                </Row>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------- account */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.account")}</CardTitle>
                <CardDescription>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    {t("account.folder")}: <span dir="ltr">{folder}</span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user ? (
                  <>
                    <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
                      {t("account.guestNotice")}
                    </p>
                    <Button asChild className="bg-youtube-red hover:bg-youtube-red/90">
                      <Link to="/auth">{t("common.signUp")}</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {t("account.role")}: {user.role}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="acc-name">{t("account.name")}</Label>
                        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acc-email">{t("account.email")}</Label>
                        <Input id="acc-email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acc-current">{t("account.currentPassword")}</Label>
                        <Input
                          id="acc-current"
                          type="password"
                          dir="ltr"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acc-new">
                          {t("account.newPassword")} <span className="text-muted-foreground">({t("common.optional")})</span>
                        </Label>
                        <Input
                          id="acc-new"
                          type="password"
                          dir="ltr"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => void saveAccount()}
                      disabled={!currentPassword}
                      className="bg-youtube-red hover:bg-youtube-red/90"
                    >
                      {t("common.save")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------------------------------------------- advanced */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("settings.tab.advanced")}</CardTitle>
                <CardDescription>{t("advanced.wipeDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button variant="outline" onClick={() => void download()}>
                  <Download className="me-2 h-4 w-4" />
                  {t("advanced.export")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void resetIndex().then(() => {
                      invalidateLibrary();
                      return refresh();
                    })
                  }
                >
                  <RefreshCw className="me-2 h-4 w-4" />
                  {t("advanced.resetIndex")}
                </Button>
                <Button variant="outline" onClick={() => void resetSettings()}>
                  {t("settings.title")} — {t("common.confirm")}
                </Button>
                <Button variant="destructive" onClick={() => void wipeEverything()}>
                  <Trash2 className="me-2 h-4 w-4" />
                  {t("advanced.wipe")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
