import { VideoCard } from "./VideoCard";
import { useNavigate } from "react-router-dom";
import thumb1 from "@/assets/thumb1.jpg";
import thumb2 from "@/assets/thumb2.jpg";
import thumb3 from "@/assets/thumb3.jpg";
import thumb4 from "@/assets/thumb4.jpg";

const suggestedVideos = [
  {
    id: "2",
    title: "أسرار الإنتاج الموسيقي في الاستوديو",
    thumbnail: thumb2,
    channelName: "موسيقى",
    channelAvatar: "/placeholder.svg",
    views: 89000,
    publishedAt: new Date(Date.now() - 5 * 86400000),
    duration: "22:15",
  },
  {
    id: "3",
    title: "جولة في أفضل غرف الألعاب 2026",
    thumbnail: thumb3,
    channelName: "ألعاب",
    channelAvatar: "/placeholder.svg",
    views: 256000,
    publishedAt: new Date(Date.now() - 86400000),
    duration: "18:45",
  },
  {
    id: "4",
    title: "تقنيات الطهي الاحترافية",
    thumbnail: thumb4,
    channelName: "فنون الطهي",
    channelAvatar: "/placeholder.svg",
    views: 78000,
    publishedAt: new Date(Date.now() - 3 * 86400000),
    duration: "25:10",
  },
  {
    id: "5",
    title: "مفاهيم JavaScript المتقدمة",
    thumbnail: thumb1,
    channelName: "أكواد",
    channelAvatar: "/placeholder.svg",
    views: 189000,
    publishedAt: new Date(Date.now() - 7 * 86400000),
    duration: "31:20",
  },
  {
    id: "6",
    title: "صناعة الإيقاعات: دليل كامل",
    thumbnail: thumb2,
    channelName: "مصنع الإيقاع",
    channelAvatar: "/placeholder.svg",
    views: 145000,
    publishedAt: new Date(Date.now() - 4 * 86400000),
    duration: "19:55",
  },
];

export function SuggestedVideos() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold sm:text-lg">مقاطع مقترحة</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {suggestedVideos.map((video) => (
          <VideoCard
            key={video.id}
            {...video}
            compact
            onClick={() => navigate(`/watch/${video.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
