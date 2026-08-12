import {
  Home,
  PlaySquare,
  Clock,
  ThumbsUp,
  ListVideo,
  TrendingUp,
  Tv,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export const mainMenuItems: NavItem[] = [
  { icon: Home, label: "الرئيسية", path: "/" },
  { icon: PlaySquare, label: "الاشتراكات", path: "/subscriptions" },
  { icon: ListVideo, label: "المكتبة", path: "/library" },
  { icon: Clock, label: "سجل المشاهدة", path: "/history" },
  { icon: ThumbsUp, label: "المفضلة", path: "/liked" },
];

export const exploreItems: NavItem[] = [
  { icon: TrendingUp, label: "الأكثر مشاهدة", path: "/trending" },
  { icon: Tv, label: "القنوات", path: "/channels" },
];

export const settingsItem: NavItem = {
  icon: Settings,
  label: "الإعدادات",
  path: "/settings",
};

export const mobileNavItems: NavItem[] = [
  mainMenuItems[0],
  mainMenuItems[1],
  exploreItems[0],
  mainMenuItems[2],
  settingsItem,
];
