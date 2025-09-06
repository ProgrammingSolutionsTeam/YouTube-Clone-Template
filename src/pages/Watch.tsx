import { useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SuggestedVideos } from "@/components/SuggestedVideos";

const Watch = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main Content */}
      <main className="pt-14 lg:pl-64 transition-all duration-300">
        <div className="flex flex-col xl:flex-row gap-6 p-4 max-w-7xl mx-auto">
          {/* Video Player Section */}
          <div className="flex-1 min-w-0">
            <VideoPlayer videoId={videoId || "1"} />
          </div>
          
          {/* Suggested Videos Sidebar */}
          <div className="xl:w-96 xl:flex-shrink-0">
            <SuggestedVideos />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Watch;