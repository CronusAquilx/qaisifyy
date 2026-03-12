import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeIFrameAPI } from '@/lib/youtube';
import { usePlayerStore } from '@/stores/playerStore';

declare global {
  interface Window {
    YT: any;
  }
}

const YouTubeEmbed = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);

  const setYTPlayer = usePlayerStore((s) => s._setYTPlayer);

  const initPlayer = useCallback(async () => {
    await loadYouTubeIFrameAPI();

    if (playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current!, {
      height: '40',
      width: '60',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          readyRef.current = true;
          setYTPlayer(playerRef.current);
        },
        onStateChange: (event: any) => {
          const state = usePlayerStore.getState();
          const YT = window.YT.PlayerState;

          if (state.playbackSource !== 'youtube') return;

          if (event.data === YT.PLAYING) {
            usePlayerStore.setState({ isPlaying: true, isLoadingAudio: false });
          } else if (event.data === YT.PAUSED) {
            usePlayerStore.setState({ isPlaying: false });
          } else if (event.data === YT.ENDED) {
            state._handleTrackEnd();
          } else if (event.data === YT.BUFFERING) {
            usePlayerStore.setState({ isLoadingAudio: true });
          }
        },
        onError: (event: any) => {
          console.error('[Qaisify] YouTube player error:', event.data);
          const state = usePlayerStore.getState();
          if (state.currentTrack && state.playbackSource === 'youtube') {
            state._fallbackFromYouTube(event.data);
          }
        },
      },
    });
  }, [setYTPlayer]);

  useEffect(() => {
    initPlayer();

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
        readyRef.current = false;
      }
    };
  }, [initPlayer]);

  return (
    <div className="relative overflow-hidden rounded flex-shrink-0" style={{ width: 60, height: 40 }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default YouTubeEmbed;
