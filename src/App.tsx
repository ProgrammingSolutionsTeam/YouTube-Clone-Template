import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerProvider";
import { SessionProvider } from "@/context/SessionProvider";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import Settings from "./pages/Settings";
import Channels from "./pages/Channels";
import Library from "./pages/Library";
import Subscriptions from "./pages/Subscriptions";
import Trending from "./pages/Trending";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Shorts from "./pages/Shorts";
import { AutoRefresh } from "@/components/AutoRefresh";
import NotFound from "./pages/NotFound";
import { RouteMeta } from "@/components/RouteMeta";

const queryClient = new QueryClient();

/** `/?v=<id>` opens the player, plain `/` is the home grid. */
const Home = () => {
  const [params] = useSearchParams();
  return params.get("v") ? <Watch /> : <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PlayerProvider>
          <RouteMeta />
          <AutoRefresh />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:videoId" element={<Watch />} />
            <Route path="/watch" element={<Watch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/library" element={<Library />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/history" element={<Library />} />
            <Route path="/liked" element={<Library />} />
            <Route path="/later" element={<Library />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/search" element={<Search />} />
            <Route path="/scrolling" element={<Shorts />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PlayerProvider>
        </BrowserRouter>
      </TooltipProvider>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
