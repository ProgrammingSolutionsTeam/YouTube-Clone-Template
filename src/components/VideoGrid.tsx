import { VideoCard } from "./VideoCard";
import { useNavigate } from "react-router-dom";
import thumb1 from "@/assets/thumb1.jpg";
import thumb2 from "@/assets/thumb2.jpg";
import thumb3 from "@/assets/thumb3.jpg";
import thumb4 from "@/assets/thumb4.jpg";

const dummyVideos = [
  {
    id: "1",
    title: "دورة تعلّم React من الصفر حتى الاحتراف",
    thumbnail: thumb1,
    channelName: "دروس برمجة",
    channelAvatar: "/placeholder.svg",
    views: 125000,
    publishedAt: new Date(Date.now() - 2 * 86400000),
    duration: "15:30",
  },
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
    title: "جولة في أفضل غرف الألعاب لعام 2026",
    thumbnail: thumb3,
    channelName: "ألعاب",
    channelAvatar: "/placeholder.svg",
    views: 256000,
    publishedAt: new Date(Date.now() - 86400000),
    duration: "18:45",
  },
  {
    id: "4",
    title: "تقنيات الطهي الاحترافية خطوة بخطوة",
    thumbnail: thumb4,
    channelName: "فنون الطهي",
    channelAvatar: "/placeholder.svg",
    views: 78000,
    publishedAt: new Date(Date.now() - 3 * 86400000),
    duration: "25:10",
  },
  {
    id: "5",
    title: "مفاهيم JavaScript المتقدمة التي يجب أن تعرفها",
    thumbnail: thumb1,
    channelName: "أكواد",
    channelAvatar: "/placeholder.svg",
    views: 189000,
    publishedAt: new Date(Date.now() - 7 * 86400000),
    duration: "31:20",
  },
  {
    id: "6",
    title: "صناعة الإيقاعات: دليل الهيب هوب الكامل",
    thumbnail: thumb2,
    channelName: "مصنع الإيقاع",
    channelAvatar: "/placeholder.svg",
    views: 145000,
    publishedAt: new Date(Date.now() - 4 * 86400000),
    duration: "19:55",
  },
  {
    id: "7",
    title: "أفضل 10 لحظات في عالم الألعاب",
    thumbnail: thumb3,
    channelName: "ألعاب ملحمية",
    channelAvatar: "/placeholder.svg",
    views: 892000,
    publishedAt: new Date(Date.now() - 6 * 86400000),
    duration: "12:30",
  },
  {
    id: "8",
    title: "وجبات بجودة المطاعم في منزلك",
    thumbnail: thumb4,
    channelName: "شيف المنزل",
    channelAvatar: "/placeholder.svg",
    views: 67000,
    publishedAt: new Date(Date.now() - 8 * 86400000),
    duration: "28:45",
  },
];

export function VideoGrid() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {dummyVideos.map((video) => (
        <VideoCard
          key={video.id}
          {...video}
          onClick={() => navigate(`/watch/${video.id}`)}
        />
      ))}
    </div>
  );
}
