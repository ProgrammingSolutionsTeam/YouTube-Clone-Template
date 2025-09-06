import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

const Subscriptions = () => {
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
        <div className="container max-w-6xl mx-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
              <p className="text-muted-foreground">
                Latest videos from your subscribed channels
              </p>
            </div>
            
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Subscriptions content coming soon...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscriptions;