import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import Settings from "./pages/Settings";
import Channels from "./pages/Channels";
import Library from "./pages/Library";
import Subscriptions from "./pages/Subscriptions";
import Trending from "./pages/Trending";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/watch/:videoId" element={<Watch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/library" element={<Library />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/history" element={<Library />} />
            <Route path="/liked" element={<Library />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
