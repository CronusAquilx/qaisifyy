import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePlayerStore } from '@/stores/playerStore';
import GradientBlobs from '@/components/backgrounds/GradientBlobs';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import PlayerBar from '@/components/player/PlayerBar';
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => {
  const init = usePlayerStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="h-screen flex flex-col relative">
      <GradientBlobs />
      <div className="flex flex-1 relative z-10 overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-[72px] md:ml-[240px] overflow-y-auto pb-[90px]">
          <TopBar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <PlayerBar />
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
