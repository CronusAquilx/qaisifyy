import { useEffect, lazy, Suspense } from 'react';
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
import MobilePlayerBar from '@/components/player/MobilePlayerBar';
import FallbackEmbed from '@/components/player/FallbackEmbed';
import Index from "./pages/Index";

// Split off everything not needed for the first paint — keeps the initial
// download small on slow/filtered proxy connections.
const SearchPage = lazy(() => import("./pages/SearchPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ArtistPage = lazy(() => import("./pages/ArtistPage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FullscreenPlayer = lazy(() => import('@/components/player/FullscreenPlayer'));
const RightPanel = lazy(() => import('@/components/panels/RightPanel'));

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
          className={`flex-1 overflow-y-auto pb-[150px] md:pb-[90px] transition-all duration-300 ${
            rightPanelOpen ? 'md:mr-[320px]' : ''
          } ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'}`}
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
      {/* Mobile player + nav */}
      <MobilePlayerBar />
      <MobileNav />
      {/* Full-screen player overlay */}
      <FullscreenPlayer />
      {/* Direct embed fallback for proxy/unblocker environments */}
      <FallbackEmbed />
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
