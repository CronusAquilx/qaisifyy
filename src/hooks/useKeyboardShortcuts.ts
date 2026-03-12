import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const player = usePlayerStore.getState();
      const ui = useUIStore.getState();

      switch (true) {
        case e.code === 'Space':
          e.preventDefault();
          player.togglePlay();
          break;
        case e.ctrlKey && e.key === 'ArrowRight':
          e.preventDefault();
          player.nextTrack();
          break;
        case e.ctrlKey && e.key === 'ArrowLeft':
          e.preventDefault();
          player.prevTrack();
          break;
        case e.ctrlKey && e.shiftKey && e.key === 'ArrowRight':
          e.preventDefault();
          player.seekTo(player.currentTime + 10);
          break;
        case e.ctrlKey && e.shiftKey && e.key === 'ArrowLeft':
          e.preventDefault();
          player.seekTo(Math.max(0, player.currentTime - 10));
          break;
        case e.key === 'm' || e.key === 'M':
          player.toggleMute();
          break;
        case e.key === 's' && !e.ctrlKey:
          player.toggleShuffle();
          break;
        case e.key === 'r' && !e.ctrlKey:
          player.toggleRepeat();
          break;
        case e.key === 'f' && !e.ctrlKey:
          ui.setFullscreenPlayer(!ui.isFullscreenPlayer);
          break;
        case e.key === 'Escape':
          if (ui.isFullscreenPlayer) ui.setFullscreenPlayer(false);
          break;
        case e.ctrlKey && e.key === 'f':
          e.preventDefault();
          navigate('/search');
          break;
        case e.ctrlKey && e.shiftKey && e.key === 'Q':
          e.preventDefault();
          ui.setRightPanelTab('queue');
          break;
        case e.ctrlKey && e.shiftKey && e.key === 'L':
          e.preventDefault();
          ui.setRightPanelTab('lyrics');
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
