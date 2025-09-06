import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Video, PlayCircle, Plus } from "lucide-react";

const Channels = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Mock channel data
  const channels = [
    {
      id: 1,
      name: "Tech Reviews",
      avatar: "/placeholder.svg",
      subscribers: "125K",
      videos: 87,
      views: "2.5M",
      status: "active"
    },
    {
      id: 2,
      name: "Gaming Content",
      avatar: "/placeholder.svg",
      subscribers: "89K",
      videos: 156,
      views: "1.8M",
      status: "active"
    },
    {
      id: 3,
      name: "Music Channel",
      avatar: "/placeholder.svg",
      subscribers: "45K",
      videos: 23,
      views: "890K",
      status: "draft"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main Content */}
      <main className="pt-14 lg:pl-64 transition-all duration-300">
        <div className="container max-w-6xl mx-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Channels</h1>
                <p className="text-muted-foreground">
                  Manage and monitor your YouTube channels
                </p>
              </div>
              <Button className="bg-youtube-red hover:bg-youtube-red/90">
                <Plus className="mr-2 h-4 w-4" />
                Create Channel
              </Button>
            </div>

            <Separator />

            {/* Channels Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel) => (
                <Card key={channel.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Avatar className="h-12 w-12 mr-4">
                      <AvatarImage src={channel.avatar} />
                      <AvatarFallback className="bg-youtube-red text-white">
                        {channel.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <Badge variant={channel.status === "active" ? "default" : "secondary"}>
                        {channel.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-sm font-medium">{channel.subscribers}</div>
                        <div className="text-xs text-muted-foreground">Subscribers</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-sm font-medium">{channel.videos}</div>
                        <div className="text-xs text-muted-foreground">Videos</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-1">
                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-sm font-medium">{channel.views}</div>
                        <div className="text-xs text-muted-foreground">Views</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Manage
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State for New Users */}
            {channels.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No channels yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first channel to start uploading videos
                  </p>
                  <Button className="bg-youtube-red hover:bg-youtube-red/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Channel
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Channels;