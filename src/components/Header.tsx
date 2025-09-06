import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu, Search, Upload, User } from "lucide-react";
import youtubeLogo from "@/assets/youtube-logo.png";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-youtube-border h-14 flex items-center px-4 shadow-[var(--shadow-header)]">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <img src={youtubeLogo} alt="YouTube" className="h-6 w-8 object-contain" />
          <span className="font-bold text-lg hidden sm:block">YouTube</span>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-2xl mx-4 flex items-center">
        <div className="flex w-full">
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-background"
          />
          <Button
            variant="outline"
            className="rounded-l-none border-l-0 px-6 hover:bg-youtube-light-gray"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-secondary">
          <Upload className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-secondary">
          <Bell className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}