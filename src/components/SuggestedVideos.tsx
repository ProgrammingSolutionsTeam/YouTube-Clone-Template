import { VideoCard } from "./VideoCard";
import { useNavigate } from "react-router-dom";
import thumb1 from "@/assets/thumb1.jpg";
import thumb2 from "@/assets/thumb2.jpg";
import thumb3 from "@/assets/thumb3.jpg";
import thumb4 from "@/assets/thumb4.jpg";

const suggestedVideos = [
  {
    id: "2",
    title: "Amazing Music Production Techniques",
    thumbnail: thumb2,
    channelName: "Music Pro",
    channelAvatar: "/placeholder.svg",
    views: 89000,
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    duration: "22:15",
  },
  {
    id: "3",
    title: "Epic Gaming Setup Tour 2024",
    thumbnail: thumb3,
    channelName: "Gaming World",
    channelAvatar: "/placeholder.svg",
    views: 256000,
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    duration: "18:45",
  },
  {
    id: "4",
    title: "Master Chef Techniques",
    thumbnail: thumb4,
    channelName: "Culinary Arts",
    channelAvatar: "/placeholder.svg",
    views: 78000,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    duration: "25:10",
  },
  {
    id: "5",
    title: "Advanced JavaScript Concepts",
    thumbnail: thumb1,
    channelName: "Code Masters",
    channelAvatar: "/placeholder.svg",
    views: 189000,
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    duration: "31:20",
  },
];

export function SuggestedVideos() {
  const navigate = useNavigate();

  const handleVideoClick = (videoId: string) => {
    navigate(`/watch/${videoId}`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-4">Up next</h2>
      <div className="space-y-2">
        {suggestedVideos.map((video) => (
          <div
            key={video.id}
            className="flex gap-2 cursor-pointer group"
            onClick={() => handleVideoClick(video.id)}
          >
            <div className="relative w-40 aspect-video bg-youtube-light-gray rounded overflow-hidden flex-shrink-0">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                {video.duration}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-4 line-clamp-2 group-hover:text-youtube-red transition-colors">
                {video.title}
              </h3>
              <p className="text-youtube-gray text-xs mt-1">{video.channelName}</p>
              <p className="text-youtube-gray text-xs">
                {video.views >= 1000000 
                  ? `${(video.views / 1000000).toFixed(1)}M` 
                  : `${(video.views / 1000).toFixed(1)}K`} views
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}