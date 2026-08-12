import { useEffect, useState } from "react";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderOpen, Save, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "library-root-paths";

const Settings = () => {
  const [path, setPath] = useState("");
  const [roots, setRoots] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRoots(JSON.parse(saved));
      } catch {
        setRoots([]);
      }
    }
  }, []);

  const persist = (next: string[]) => {
    setRoots(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addRoot = () => {
    const value = path.trim();
    if (!value) {
      toast({ title: "خطأ", description: "أدخل مسارًا صحيحًا.", variant: "destructive" });
      return;
    }
    if (roots.includes(value)) {
      toast({ title: "موجود مسبقًا", description: "هذا المسار مضاف بالفعل." });
      return;
    }
    persist([...roots, value]);
    setPath("");
    toast({ title: "تم الحفظ", description: "أُضيف المسار إلى المكتبة." });
  };

  const pickFolder = async () => {
    const picker = (window as unknown as {
      showDirectoryPicker?: () => Promise<{ name: string }>;
    }).showDirectoryPicker;

    if (!picker) {
      toast({
        title: "غير مدعوم",
        description: "متصفحك لا يدعم اختيار المجلدات، اكتب المسار يدويًا.",
        variant: "destructive",
      });
      return;
    }
    try {
      const dir = await picker();
      setPath(dir.name);
    } catch {
      /* أُلغي الاختيار */
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <PageHeading
          title="الإعدادات"
          description="حدّد مسارات المكتبة المحلية وخصّص تجربة المشاهدة"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5" />
              مسارات المكتبة
            </CardTitle>
            <CardDescription>
              كل مجلد فرعي داخل المسار يتحول تلقائيًا إلى قناة، والمجلدات الداخلية إلى قوائم تشغيل.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="root-path">المسار</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="root-path"
                  placeholder="مثال: F:\\#Videos"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={pickFolder} className="flex-1 sm:flex-none">
                    استعراض
                  </Button>
                  <Button
                    onClick={addRoot}
                    className="flex-1 bg-youtube-red hover:bg-youtube-red/90 sm:flex-none"
                  >
                    <Save className="me-2 h-4 w-4" />
                    حفظ
                  </Button>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                المسارات الحقيقية لا تُعرض للمستخدمين، ويتم استخدام معرفات آمنة بدلًا منها.
              </p>
            </div>

            {roots.length > 0 && (
              <div className="space-y-2">
                <Label>المسارات المضافة</Label>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {roots.map((r) => (
                    <li key={r} className="flex items-center gap-2 bg-secondary/40 px-3 py-2">
                      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">
                        {r}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="حذف"
                        onClick={() => persist(roots.filter((x) => x !== r))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
