import { useLocation } from "react-router-dom";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const Library = () => {
  const { pathname } = useLocation();
  const initial =
    pathname === "/history" ? "history" : pathname === "/liked" ? "liked" : "all";

  const titles: Record<string, { title: string; description: string }> = {
    all: { title: "المكتبة", description: "مقاطعك وقوائم التشغيل المحفوظة" },
    history: { title: "سجل المشاهدة", description: "ما شاهدته مؤخرًا" },
    liked: { title: "المفضلة", description: "المقاطع التي أعجبتك" },
  };

  return (
    <AppLayout>
      <PageHeading {...titles[initial]} />
      <Tabs defaultValue={initial}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">الكل</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">السجل</TabsTrigger>
          <TabsTrigger value="liked" className="flex-1 sm:flex-none">المفضلة</TabsTrigger>
          <TabsTrigger value="later" className="flex-1 sm:flex-none">لاحقًا</TabsTrigger>
        </TabsList>
        {["all", "history", "liked", "later"].map((v) => (
          <TabsContent key={v} value={v}>
            <VideoGrid />
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
};

export default Library;
