import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/UserMenu";
import { Bell, Menu, Search, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import youtubeLogo from "@/assets/youtube-logo.png";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-youtube-border h-14 flex items-center px-4 shadow-[var(--shadow-header)]">
      {/* Left Section */}
      <div className="flex items-center gap-4 w-64">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-1 hover:bg-secondary rounded-lg p-2 transition-colors"
        >
          <img src={youtubeLogo} alt="YouTube" className="h-6 w-8 object-contain" />
          <span className="font-bold text-lg hidden sm:block">YouTube</span>
        </button>
      </div>

      {/* Center Section - Search (Centered) */}
      <div className="flex-1 flex justify-center px-4">
        <div className="flex w-full max-w-2xl">
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
      <div className="flex items-center gap-2 w-64 justify-end">
        <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-secondary">
          <Upload className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-secondary">
          <Bell className="h-5 w-5" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}