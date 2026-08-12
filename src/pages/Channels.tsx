import { useState } from "react";
import { AppLayout, PageHeading } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, PlayCircle, Plus } from "lucide-react";

const channels = [
  { id: 1, name: "أفلام وثائقية", avatar: "/placeholder.svg", subscribers: "125 ألف", videos: 87, views: "2.5 مليون", status: "نشطة" },
  { id: 2, name: "ألعاب", avatar: "/placeholder.svg", subscribers: "89 ألف", videos: 156, views: "1.8 مليون", status: "نشطة" },
  { id: 3, name: "موسيقى", avatar: "/placeholder.svg", subscribers: "45 ألف", videos: 23, views: "890 ألف", status: "مسودة" },
];

const Channels = () => {
  const [items] = useState(channels);

  return (
    <AppLayout>
      <PageHeading
        title="القنوات"
        description="كل مجلد رئيسي يظهر هنا كقناة مستقلة"
        action={
          <Button className="w-full bg-youtube-red hover:bg-youtube-red/90 sm:w-auto">
            <Plus className="me-2 h-4 w-4" />
            إضافة قناة
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((channel) => (
          <Card key={channel.id} className="transition-shadow hover:shadow-[var(--shadow-hover)]">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={channel.avatar} />
                <AvatarFallback className="bg-youtube-red text-primary-foreground">
                  {channel.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{channel.name}</CardTitle>
                <Badge variant={channel.status === "نشطة" ? "default" : "secondary"} className="mt-1">
                  {channel.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: Users, value: channel.subscribers, label: "متابع" },
                  { icon: Video, value: channel.videos, label: "مقطع" },
                  { icon: PlayCircle, value: channel.views, label: "مشاهدة" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-secondary/60 py-2">
                    <s.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-semibold">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">إدارة</Button>
                <Button variant="outline" size="sm" className="flex-1">إحصائيات</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
};

export default Channels;
