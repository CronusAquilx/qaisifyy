import { create } from 'zustand';

interface UIState {
  rightPanelOpen: boolean;
  rightPanelTab: 'queue' | 'lyrics';
  isFullscreenPlayer: boolean;
  isSidebarCollapsed: boolean;
  sleepTimer: number | null; // minutes remaining
  sleepTimerId: number | null;
  
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: 'queue' | 'lyrics') => void;
  setFullscreenPlayer: (open: boolean) => void;
  toggleSidebar: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  rightPanelOpen: false,
  rightPanelTab: 'queue',
  isFullscreenPlayer: false,
  isSidebarCollapsed: false,
  sleepTimer: null,
  sleepTimerId: null,

  toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab, rightPanelOpen: true }),
  setFullscreenPlayer: (open) => set({ isFullscreenPlayer: open }),
  toggleSidebar: () => set(s => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  setSleepTimer: (minutes) => {
    const prev = get().sleepTimerId;
    if (prev) clearInterval(prev);
    
    if (minutes === null) {
      set({ sleepTimer: null, sleepTimerId: null });
      return;
    }

    set({ sleepTimer: minutes });
    const id = window.setInterval(() => {
      const current = get().sleepTimer;
      if (current === null || current <= 0) {
        clearInterval(get().sleepTimerId!);
        set({ sleepTimer: null, sleepTimerId: null });
        // Fade out and pause
        const { usePlayerStore } = require('@/stores/playerStore');
        const player = usePlayerStore.getState();
        if (player.isPlaying) {
          player.togglePlay();
        }
        return;
      }
      set({ sleepTimer: current - 1 });
    }, 60000);
    set({ sleepTimerId: id });
  },
}));
