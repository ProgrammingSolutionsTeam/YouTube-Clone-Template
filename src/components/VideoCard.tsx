import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelAvatar: string;
  views: number;
  publishedAt: Date;
  duration: string;
  onClick?: () => void;
}

export function VideoCard({
  title,
  thumbnail,
  channelName,
  channelAvatar,
  views,
  publishedAt,
  duration,
  onClick,
}: VideoCardProps) {
  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const timeAgo = formatDistanceToNow(publishedAt, { addSuffix: true });

  return (
    <div
      className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-youtube-light-gray rounded-lg overflow-hidden shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-hover)] transition-shadow">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
          {duration}
        </div>
      </div>

      {/* Video Info */}
      <div className="flex gap-3 mt-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={channelAvatar} />
          <AvatarFallback className="text-xs">
            {channelName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-5 line-clamp-2 text-foreground group-hover:text-youtube-red transition-colors">
            {title}
          </h3>
          <p className="text-youtube-gray text-sm mt-1 hover:text-foreground cursor-pointer">
            {channelName}
          </p>
          <div className="flex items-center text-youtube-gray text-sm mt-1">
            <span>{formatViews(views)} views</span>
            <span className="mx-1">•</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}