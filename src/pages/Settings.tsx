import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FolderOpen, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Load saved folder path from localStorage
    const savedPath = localStorage.getItem("youtube-folder-path");
    if (savedPath) {
      setFolderPath(savedPath);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSave = () => {
    if (folderPath.trim()) {
      localStorage.setItem("youtube-folder-path", folderPath.trim());
      toast({
        title: "Settings saved",
        description: "Folder path has been saved successfully.",
      });
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid folder path.",
        variant: "destructive",
      });
    }
  };

  const handleBrowseFolder = () => {
    // In a real application, this would open a native folder picker
    // For now, we'll just show a message
    toast({
      title: "Folder Browser",
      description: "In a real app, this would open a native folder picker.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main Content */}
      <main className="pt-14 lg:pl-64 transition-all duration-300">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your YouTube application preferences
              </p>
            </div>

            <Separator />

            {/* Video Folder Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Video Folder Configuration
                </CardTitle>
                <CardDescription>
                  Set the folder path where your videos are stored. Each subfolder will represent a channel.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-path">Folder Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="folder-path"
                      placeholder="e.g., /Users/username/Videos/YouTube"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleBrowseFolder}
                      className="shrink-0"
                    >
                      Browse
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Each subfolder inside this path will be treated as a separate channel
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-youtube-red hover:bg-youtube-red/90">
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                </div>

                {folderPath && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Current Configuration:</h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Folder Path:</strong> {folderPath}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Expected Structure:</strong>
                    </p>
                    <pre className="text-xs mt-2 text-muted-foreground">
{`${folderPath}/
├── Channel1/
│   ├── video1.mp4
│   └── video2.mp4
├── Channel2/
│   ├── video3.mp4
│   └── video4.mp4
└── Channel3/
    └── video5.mp4`}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Settings Sections */}
            <Card>
              <CardHeader>
                <CardTitle>Playback Settings</CardTitle>
                <CardDescription>
                  Configure video playback preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional playback settings will be available in future updates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your privacy preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Privacy controls will be available in future updates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;