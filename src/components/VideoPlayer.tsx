import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  ThumbsDown,
  Share,
  Download,
  MoreHorizontal,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  // Mock video data based on videoId
  const videoData = {
    title: "Learn React in 2024 - Complete Beginner's Guide",
    views: 125000,
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    likes: 5200,
    dislikes: 89,
    channelName: "Tech Academy",
    channelAvatar: "/placeholder.svg",
    subscribers: "1.2M",
    description: `In this comprehensive React tutorial, you'll learn everything you need to know to get started with React in 2024. 

We'll cover:
- Setting up your development environment
- Understanding components and JSX
- State management with hooks
- Props and component communication
- Event handling
- Best practices for React development

Perfect for beginners who want to learn modern React development from scratch!

🔗 Links:
- Source code: github.com/example
- React documentation: reactjs.org

⏰ Timestamps:
00:00 Introduction
02:30 Setting up React
05:15 Your first component
10:45 Understanding JSX
15:30 Working with state`,
  };

  const formatViews = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const timeAgo = formatDistanceToNow(videoData.publishedAt, { addSuffix: true });

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked) setIsLiked(false);
  };

  return (
    <div className="space-y-4">
      {/* Video Player Placeholder */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-xl font-medium">Video Player Placeholder</div>
        </div>
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-black bg-opacity-50 text-white">
            HD
          </Badge>
        </div>
      </div>

      {/* Video Title */}
      <h1 className="text-xl font-semibold leading-6">{videoData.title}</h1>

      {/* Video Stats and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-youtube-gray text-sm">
          <span>{formatViews(videoData.views)} views</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Like/Dislike */}
          <div className="flex items-center bg-youtube-light-gray rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-r-none hover:bg-secondary ${
                isLiked ? "text-youtube-red" : ""
              }`}
              onClick={handleLike}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              {formatViews(videoData.likes + (isLiked ? 1 : 0))}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-l-none hover:bg-secondary ${
                isDisliked ? "text-youtube-red" : ""
              }`}
              onClick={handleDislike}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Share */}
          <Button variant="outline" size="sm" className="rounded-full">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>

          {/* Download */}
          <Button variant="outline" size="sm" className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          {/* More */}
          <Button variant="outline" size="icon" className="rounded-full">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Channel Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={videoData.channelAvatar} />
            <AvatarFallback>
              {videoData.channelName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{videoData.channelName}</h3>
            <p className="text-sm text-youtube-gray">
              {videoData.subscribers} subscribers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isSubscribed ? "secondary" : "default"}
            size="sm"
            className={`rounded-full ${
              isSubscribed
                ? "bg-youtube-light-gray hover:bg-youtube-light-gray text-foreground"
                : "bg-youtube-red hover:bg-youtube-red text-white"
            }`}
            onClick={() => setIsSubscribed(!isSubscribed)}
          >
            <Bell className="h-4 w-4 mr-2" />
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="bg-youtube-light-gray rounded-lg p-4">
        <div className="text-sm whitespace-pre-line">{videoData.description}</div>
      </div>
    </div>
  );
}