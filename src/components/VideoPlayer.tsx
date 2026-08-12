import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [expanded, setExpanded] = useState(false);

  const video = {
    title: "دورة تعلّم React من الصفر حتى الاحتراف",
    views: 125000,
    publishedAt: "قبل يومين",
    likes: 5200,
    channelName: "دروس برمجة",
    channelAvatar: "/placeholder.svg",
    subscribers: "1.2 مليون",
    description:
      "في هذه الدورة الشاملة ستتعلم كل ما تحتاجه للبدء مع React: تهيئة بيئة العمل، المكونات و JSX، إدارة الحالة عبر الـ Hooks، تمرير الخصائص، التعامل مع الأحداث، وأفضل الممارسات في التطوير الحديث.",
  };

  const actions = [
    { icon: Share2, label: "مشاركة" },
    { icon: Download, label: "تنزيل" },
    { icon: Clock, label: "لاحقًا" },
  ];

  return (
    <div className="space-y-4">
      {/* المشغل */}
      <div className="relative aspect-video w-full overflow-hidden bg-youtube-dark sm:rounded-xl">
        <video
          className="h-full w-full"
          controls
          playsInline
          poster="/placeholder.svg"
          key={videoId}
        />
      </div>

      <div className="space-y-4 px-3 sm:px-0">
        <h1 className="text-base font-bold leading-6 sm:text-xl">{video.title}</h1>

        {/* القناة + الإجراءات */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={video.channelAvatar} />
              <AvatarFallback>{video.channelName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{video.channelName}</p>
              <p className="text-xs text-muted-foreground">{video.subscribers} متابع</p>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "secondary" : "default"}
              onClick={() => setIsSubscribed((v) => !v)}
              className={cn("rounded-full", !isSubscribed && "bg-youtube-red hover:bg-youtube-red/90")}
            >
              {isSubscribed ? "مُتابع" : "متابعة"}
            </Button>
          </div>

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex shrink-0 items-center rounded-full bg-secondary">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReaction(reaction === "like" ? null : "like")}
                className="rounded-full"
              >
                <ThumbsUp className={cn("me-2 h-4 w-4", reaction === "like" && "text-youtube-red")} />
                {video.likes.toLocaleString("en-US")}
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReaction(reaction === "dislike" ? null : "dislike")}
                className="rounded-full"
              >
                <ThumbsDown className={cn("h-4 w-4", reaction === "dislike" && "text-youtube-red")} />
              </Button>
            </div>
            {actions.map((a) => (
              <Button key={a.label} variant="secondary" size="sm" className="shrink-0 rounded-full">
                <a.icon className="me-2 h-4 w-4" />
                {a.label}
              </Button>
            ))}
            <Button variant="secondary" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="المزيد">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* الوصف */}
        <div className="rounded-xl bg-secondary/70 p-3 sm:p-4">
          <p className="text-xs font-semibold sm:text-sm">
            {video.views.toLocaleString("en-US")} مشاهدة • {video.publishedAt}
          </p>
          <p
            className={cn(
              "mt-2 whitespace-pre-line text-sm leading-6 text-foreground/90",
              !expanded && "line-clamp-2"
            )}
          >
            {video.description}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {expanded ? "عرض أقل" : "عرض المزيد"}
          </button>
        </div>
      </div>
    </div>
  );
}
