import { VideoCard } from "./VideoCard";
import { useNavigate } from "react-router-dom";
import thumb1 from "@/assets/thumb1.jpg";
import thumb2 from "@/assets/thumb2.jpg";
import thumb3 from "@/assets/thumb3.jpg";
import thumb4 from "@/assets/thumb4.jpg";

const dummyVideos = [
  {
    id: "1",
    title: "Learn React in 2024 - Complete Beginner's Guide",
    thumbnail: thumb1,
    channelName: "Tech Academy",
    channelAvatar: "/placeholder.svg",
    views: 125000,
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    duration: "15:30",
  },
  {
    id: "2",
    title: "Amazing Music Production Techniques - Studio Secrets",
    thumbnail: thumb2,
    channelName: "Music Pro",
    channelAvatar: "/placeholder.svg",
    views: 89000,
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    duration: "22:15",
  },
  {
    id: "3",
    title: "Epic Gaming Setup Tour 2024 - RGB Everything!",
    thumbnail: thumb3,
    channelName: "Gaming World",
    channelAvatar: "/placeholder.svg",
    views: 256000,
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    duration: "18:45",
  },
  {
    id: "4",
    title: "Master Chef Techniques - Cook Like a Professional",
    thumbnail: thumb4,
    channelName: "Culinary Arts",
    channelAvatar: "/placeholder.svg",
    views: 78000,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    duration: "25:10",
  },
  {
    id: "5",
    title: "Advanced JavaScript Concepts Every Developer Should Know",
    thumbnail: thumb1,
    channelName: "Code Masters",
    channelAvatar: "/placeholder.svg",
    views: 189000,
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    duration: "31:20",
  },
  {
    id: "6",
    title: "Beat Making Tutorial - Hip Hop Production 2024",
    thumbnail: thumb2,
    channelName: "Beat Factory",
    channelAvatar: "/placeholder.svg",
    views: 145000,
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    duration: "19:55",
  },
  {
    id: "7",
    title: "Top 10 Gaming Moments That Broke the Internet",
    thumbnail: thumb3,
    channelName: "Epic Gaming",
    channelAvatar: "/placeholder.svg",
    views: 892000,
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    duration: "12:30",
  },
  {
    id: "8",
    title: "Gourmet Cooking at Home - Restaurant Quality Meals",
    thumbnail: thumb4,
    channelName: "Home Chef",
    channelAvatar: "/placeholder.svg",
    views: 67000,
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 1 week ago
    duration: "28:45",
  },
];

export function VideoGrid() {
  const navigate = useNavigate();

  const handleVideoClick = (videoId: string) => {
    navigate(`/watch/${videoId}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 p-4">
      {dummyVideos.map((video) => (
        <VideoCard
          key={video.id}
          {...video}
          onClick={() => handleVideoClick(video.id)}
        />
      ))}
    </div>
  );
}