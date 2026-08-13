import {
  Clock,
  Compass,
  FolderTree,
  Heart,
  Home,
  Library,
  Settings,
  TrendingUp,
  Tv,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
}

export const mainMenuItems: NavItem[] = [
  { path: "/", labelKey: "nav.home", icon: Home },
  { path: "/browse", labelKey: "nav.browse", icon: FolderTree },
  { path: "/subscriptions", labelKey: "nav.subscriptions", icon: Tv },
  { path: "/library", labelKey: "nav.library", icon: Library },
];

export const exploreItems: NavItem[] = [
  { path: "/trending", labelKey: "nav.trending", icon: TrendingUp },
  { path: "/channels", labelKey: "nav.channels", icon: Compass },
  { path: "/history", labelKey: "nav.history", icon: Clock },
  { path: "/liked", labelKey: "nav.liked", icon: Heart },
];

export const settingsItem: NavItem = { path: "/settings", labelKey: "nav.settings", icon: Settings };
