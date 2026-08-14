import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, ShieldCheck } from "lucide-react";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { t, signIn, signUp, accountCount } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<"in" | "up">(accountCount === 0 ? "up" : "in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") await signUp({ displayName, email, password });
      else await signIn({ email, password });
      navigate("/");
    } catch (error) {
      const key = error instanceof Error ? error.message : "account.notFound";
      toast({ title: t(key), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-xl font-extrabold">
          <span className="grid h-7 w-9 place-items-center rounded bg-youtube-red">
            <Play className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
          </span>
          {t("app.name")}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{mode === "up" ? t("common.signUp") : t("common.signIn")}</CardTitle>
            <CardDescription>{t("auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t("account.name")}</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("account.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("account.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  minLength={6}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {mode === "up" && accountCount === 0 && (
                <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("auth.firstAdmin")}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-youtube-red hover:bg-youtube-red/90"
              >
                {mode === "up" ? t("common.signUp") : t("common.signIn")}
              </Button>
            </form>

            <div className="mt-4 flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === "up" ? "in" : "up")}
                className="text-muted-foreground hover:text-foreground"
              >
                {mode === "up" ? t("auth.haveAccount") : t("auth.needAccount")}{" "}
                <span className="font-semibold text-youtube-red">
                  {mode === "up" ? t("common.signIn") : t("common.signUp")}
                </span>
              </button>
              <Button variant="ghost" asChild>
                <Link to="/">{t("auth.continueGuest")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
