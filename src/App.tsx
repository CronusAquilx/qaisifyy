import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import GradientBlobs from '@/components/backgrounds/GradientBlobs';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MobileNav from '@/components/layout/MobileNav';
import PlayerBar from '@/components/player/PlayerBar';
import FullscreenPlayer from '@/components/player/FullscreenPlayer';
import RightPanel from '@/components/panels/RightPanel';
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import ArtistPage from "./pages/ArtistPage";
import AlbumPage from "./pages/AlbumPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => {
  const init = usePlayerStore((s) => s.init);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const sidebarWidth = isSidebarCollapsed ? 72 : 240;

  useEffect(() => {
    init();
  }, [init]);

  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col relative">
      <GradientBlobs />
      <div className="flex flex-1 relative z-10 overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar />
        <main
          className={`flex-1 ml-0 md:ml-[240px] overflow-y-auto pb-[150px] md:pb-[90px] transition-all duration-300 ${
            rightPanelOpen ? 'md:mr-[320px]' : ''
          }`}
        >
          <TopBar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/artist/:artistName" element={<ArtistPage />} />
            <Route path="/album/:collectionId" element={<AlbumPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <RightPanel />
      </div>
      {/* Desktop player bar */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>
      {/* Mobile bottom nav */}
      <MobileNav />
      {/* Full-screen player overlay */}
      <FullscreenPlayer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
