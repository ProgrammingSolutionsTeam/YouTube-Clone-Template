import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import {
  lastSync, serverInfo, serverUrl, setSyncOptions, syncLogin, syncLogout, syncOptions, syncPull, syncPush,
  syncRegister, syncUser, SyncError, type SyncOptions, type SyncUser,
} from "@/lib/sync/client";

export function SyncCard() {
  const s = useSession();
  const { toast } = useToast();
  const L = (ar: string, en: string) => (s.settings.language === "ar" ? ar : en);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [user, setUser] = useState<SyncUser | null>(syncUser());
  const [opts, setOpts] = useState<SyncOptions>(syncOptions());
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(lastSync());

  useEffect(() => { void serverInfo().then((i) => setAvailable(Boolean(i?.sync))); }, []);

  const fail = (e: unknown) => {
    const code = e instanceof SyncError ? e.code : "server_error";
    const msg: Record<string, string> = {
      offline: L("تعذر الوصول للخادم الرئيسي", "Can't reach the main server"),
      wrong_credentials: L("البريد أو كلمة المرور غير صحيحة", "Wrong email or password"),
      exists: L("هذا البريد مسجل مسبقًا", "This email is already registered"),
      invalid_input: L("تحقق من البيانات (كلمة المرور 8 أحرف على الأقل)", "Check your details (password 8+ characters)"),
    };
    toast({ title: msg[code] ?? L("حدث خطأ في الخادم", "Server error"), variant: "destructive" });
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const o = syncOptions();
      // 1) pull what other devices saved, merge it here
      const remote = await syncPull();
      if (o.settings && remote.settings?.settings && Object.keys(remote.settings.settings).length && !last) {
        await s.updateSettings(remote.settings.settings as never);
      }
      if (o.likes) for (const l of remote.likes) if (!l.deleted && !s.favorites.items.includes(l.media_id)) await s.toggleFavorite(l.media_id);
      if (o.watchLater) for (const l of remote.watchLater) if (!l.deleted && !s.watchLater.items.includes(l.media_id)) await s.toggleWatchLater(l.media_id);
      if (o.history) {
        const known = new Set(s.history.map((h) => h.id));
        for (const h of remote.history) if (!known.has(h.media_id))
          await s.recordWatch({ id: h.media_id, title: h.title ?? "", rootKey: "", segments: [], channel: "", at: Number(h.at), position: h.position, duration: h.duration ?? 0 } as never);
      }
      // 2) push this device's data
      const now = Date.now();
      await syncPush({
        settings: o.settings ? s.settings : undefined,
        likes: o.likes ? s.favorites.items.map((id) => ({ id, at: now })) : [],
        watchLater: o.watchLater ? s.watchLater.items.map((id) => ({ id, at: now })) : [],
        history: o.history ? s.history.map((h) => ({ id: h.id, title: h.title, position: h.position, duration: h.duration, at: h.at })) : [],
      });
      setLast(lastSync());
      toast({ title: L("تمت المزامنة", "Synced") });
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = mode === "up" ? await syncRegister(name, email, password) : await syncLogin(email, password);
      setUser(u); setPassword("");
      setBusy(false);
      await syncNow();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const toggle = (k: keyof SyncOptions) => { const n = { ...opts, [k]: !opts[k] }; setOpts(n); setSyncOptions(n); };
  const rows: [keyof SyncOptions, string][] = [
    ["settings", L("الإعدادات", "Settings")], ["likes", L("الإعجابات", "Likes")],
    ["watchLater", L("المشاهدة لاحقًا", "Watch later")], ["history", L("سجل المشاهدة ونسبة التقدم", "History & progress")],
    ["roots", L("نشر الجذور والقنوات", "Publish roots & channels")], ["views", L("عدّ المشاهدات", "Count views")],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {available ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          {L("الحساب المتزامن", "Synced account")}
        </CardTitle>
        <CardDescription>
          {L("حسابك المحلي يبقى على هذا الجهاز. الحساب المتزامن يحفظ ما تختاره في الخادم الرئيسي لتجده من أي جهاز.",
             "Your local account stays on this device. A synced account keeps what you choose on the main server so you find it on any device.")}
          <span className="mt-1 block" dir="ltr">{serverUrl()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {available === false && (
          <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
            {L("الخادم الرئيسي غير مُعدّ بعد. اتبع خطوة «الخادم الرئيسي» في دليل التشغيل.", "The main server isn't set up yet. Follow the “Main server” step in the documentation.")}
          </p>
        )}
        {available && !user && (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {mode === "up" && (
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="sy-name">{L("الاسم", "Name")}</Label>
                <Input id="sy-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            )}
            <div className="space-y-2"><Label htmlFor="sy-email">{L("البريد", "Email")}</Label>
              <Input id="sy-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="sy-pass">{L("كلمة المرور", "Password")}</Label>
              <Input id="sy-pass" type="password" dir="ltr" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy} className="bg-youtube-red hover:bg-youtube-red/90">
                {mode === "up" ? L("إنشاء حساب متزامن", "Create synced account") : L("تسجيل الدخول", "Sign in")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode(mode === "up" ? "in" : "up")}>
                {mode === "up" ? L("لدي حساب", "I have an account") : L("حساب جديد", "New account")}
              </Button>
            </div>
          </form>
        )}
        {user && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{user.displayName}</Badge>
              <span dir="ltr" className="text-muted-foreground">{user.email}</span>
              {user.role === "admin" && <Badge>{L("مسؤول", "Admin")}</Badge>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rows.map(([k, label]) => (
                <label key={k} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  {label}<Switch checked={opts[k]} onCheckedChange={() => toggle(k)} />
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {L("آخر مزامنة: ", "Last sync: ")}{last ? new Date(last).toLocaleString() : "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void syncNow()} disabled={busy}><RefreshCw className="me-2 h-4 w-4" />{L("مزامنة الآن", "Sync now")}</Button>
              <Button variant="outline" asChild><Link to="/support">{L("الدعم والشكاوى", "Support")}</Link></Button>
              <Button variant="ghost" onClick={() => void syncLogout().then(() => setUser(null))}>{L("خروج من الحساب المتزامن", "Sign out of sync")}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
