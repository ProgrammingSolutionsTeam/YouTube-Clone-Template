import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  PlaySquare,
  Clock,
  ThumbsUp,
  ListVideo,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const mainMenuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: PlaySquare, label: "Subscriptions", path: "/subscriptions" },
  { icon: ListVideo, label: "Library", path: "/library" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: ThumbsUp, label: "Liked videos", path: "/liked" },
];

const exploreItems = [
  { icon: TrendingUp, label: "Trending", path: "/trending" },
];

const subscriptions = [
  { name: "Tech Channel", avatar: "/placeholder.svg", subscribers: "2.5M" },
  { name: "Music Mix", avatar: "/placeholder.svg", subscribers: "1.8M" },
  { name: "Gaming World", avatar: "/placeholder.svg", subscribers: "987K" },
  { name: "Cooking Master", avatar: "/placeholder.svg", subscribers: "543K" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-background border-r border-youtube-border z-40 transform transition-transform duration-300 lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            {/* Main Menu */}
            {mainMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.label}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-6 h-10",
                    isActive && "bg-youtube-light-gray hover:bg-youtube-light-gray"
                  )}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}

            <Separator className="my-3" />

            {/* Explore */}
            <div className="space-y-1">
              <h3 className="px-3 py-2 text-sm font-medium text-youtube-gray">Explore</h3>
              {exploreItems.map((item) => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start gap-6 h-10"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Subscriptions */}
            <div className="space-y-1">
              <h3 className="px-3 py-2 text-sm font-medium text-youtube-gray">Subscriptions</h3>
              {subscriptions.map((subscription) => (
                <Button
                  key={subscription.name}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 px-3"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={subscription.avatar} />
                    <AvatarFallback className="text-xs">
                      {subscription.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm">{subscription.name}</div>
                  </div>
                </Button>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Settings */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-6 h-10"
              onClick={() => {
                navigate('/settings');
                onClose();
              }}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}