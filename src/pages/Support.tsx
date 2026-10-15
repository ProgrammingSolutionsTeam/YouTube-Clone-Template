import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/SessionProvider";
import { useToast } from "@/hooks/use-toast";
import { adminOverview, createTicket, listTickets, replyTicket, syncUser, type Ticket } from "@/lib/sync/client";

const Support = () => {
  const { settings } = useSession();
  const { toast } = useToast();
  const L = (ar: string, en: string) => (settings.language === "ar" ? ar : en);
  const user = syncUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kind, setKind] = useState("support");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [overview, setOverview] = useState<any>(null);

  const load = () => {
    if (!user) return;
    void listTickets().then(setTickets).catch(() => {});
    if (user.role === "admin") void adminOverview().then(setOverview).catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createTicket(kind, subject, body); setSubject(""); setBody(""); toast({ title: L("تم الإرسال", "Sent") }); load(); }
    catch { toast({ title: L("تعذر الإرسال", "Couldn't send"), variant: "destructive" }); }
  };
  const reply = async (id: string, close = false) => {
    try { await replyTicket(id, replies[id] || L("تم الإغلاق", "Closed"), close); setReplies({ ...replies, [id]: "" }); load(); }
    catch { toast({ title: L("تعذر الإرسال", "Couldn't send"), variant: "destructive" }); }
  };
  const kinds: [string, string][] = [["support", L("دعم", "Support")], ["suggestion", L("توصية", "Suggestion")], ["complaint", L("شكوى", "Complaint")]];

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <PageHeading title={L("الدعم والتوصيات والشكاوى", "Support, suggestions & complaints")} />
        {!user ? (
          <p className="text-sm text-muted-foreground">
            {L("سجّل الدخول بحساب متزامن من ", "Sign in with a synced account from ")}
            <Link to="/settings" className="text-youtube-red">{L("الإعدادات > الحساب", "Settings > Account")}</Link>
          </p>
        ) : (
          <>
            {overview && (
              <Card><CardHeader><CardTitle className="text-base">{L("لوحة المسؤول", "Admin overview")}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>{L("المستخدمون", "Users")}: <b>{overview.counts.users}</b></div>
                  <div>{L("الجلسات", "Sessions")}: <b>{overview.counts.sessions}</b></div>
                  <div>{L("زيارات اليوم", "Visits today")}: <b>{overview.counts.visits_today}</b></div>
                  <div>{L("رسائل مفتوحة", "Open tickets")}: <b>{overview.counts.open_tickets}</b></div>
                </CardContent></Card>
            )}
            <Card><CardContent className="pt-6">
              <form onSubmit={send} className="space-y-3">
                <div className="flex gap-2">{kinds.map(([k, l]) => (
                  <Button key={k} type="button" size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{l}</Button>
                ))}</div>
                <Input placeholder={L("العنوان", "Subject")} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} required />
                <Textarea placeholder={L("اكتب رسالتك", "Write your message")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required />
                <Button type="submit" className="bg-youtube-red hover:bg-youtube-red/90">{L("إرسال", "Send")}</Button>
              </form>
            </CardContent></Card>
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2"><CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {t.subject}<Badge variant="secondary">{kinds.find(([k]) => k === t.kind)?.[1]}</Badge><Badge variant="outline">{t.status}</Badge>
                  {user.role === "admin" && <span className="text-xs text-muted-foreground">{t.author}</span>}
                </CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {t.messages.map((m, i) => (
                    <p key={i} className={m.fromAdmin ? "rounded bg-secondary p-2" : "p-2"}>{m.body}</p>
                  ))}
                  {t.status !== "closed" && (
                    <div className="flex gap-2">
                      <Input value={replies[t.id] ?? ""} onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })} placeholder={L("رد", "Reply")} />
                      <Button size="sm" onClick={() => void reply(t.id)} disabled={!replies[t.id]}>{L("رد", "Reply")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void reply(t.id, true)}>{L("إغلاق", "Close")}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Support;
