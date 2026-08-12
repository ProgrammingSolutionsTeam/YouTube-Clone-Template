import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  channelAvatar: string;
  views: number;
  publishedAt: Date;
  duration: string;
  /** تخطيط أفقي مضغوط (للمقترحات) */
  compact?: boolean;
  onClick?: () => void;
}

const formatViews = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)} مليون`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)} ألف`;
  return String(count);
};

const timeAgoAr = (date: Date): string => {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `قبل ${days} أيام`;
  if (days < 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
  if (days < 365) return `قبل ${Math.floor(days / 30)} أشهر`;
  return `قبل ${Math.floor(days / 365)} سنوات`;
};

export function VideoCard({
  title,
  thumbnail,
  channelName,
  channelAvatar,
  views,
  publishedAt,
  duration,
  compact = false,
  onClick,
}: VideoCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        "group cursor-pointer",
        compact ? "flex gap-3" : "flex flex-col"
      )}
    >
      <div
        className={cn(
          "relative aspect-video shrink-0 overflow-hidden rounded-xl bg-secondary shadow-[var(--shadow-card)] transition-shadow group-hover:shadow-[var(--shadow-hover)]",
          compact ? "w-36 sm:w-40" : "w-full"
        )}
      >
        <img
          src={thumbnail}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 end-1.5 rounded bg-youtube-dark/85 px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
          {duration}
        </span>
      </div>

      <div className={cn("flex min-w-0 gap-3", compact ? "flex-1" : "mt-3")}>
        {!compact && (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={channelAvatar} />
            <AvatarFallback className="text-xs">
              {channelName.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-youtube-red",
              compact ? "text-[13px] leading-5" : "text-sm leading-5"
            )}
          >
            {title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
            {channelName}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {formatViews(views)} مشاهدة • {timeAgoAr(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
