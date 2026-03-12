import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { upgradeArtwork } from '@/lib/itunes';
import { Play, Pause, SkipForward } from 'lucide-react';

const MobilePlayerBar = () => {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, nextTrack } = usePlayerStore();
  const { setFullscreenPlayer } = useUIStore();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[60px] left-0 right-0 z-50 md:hidden">
      <div className="glass-elevated mx-2 rounded-xl overflow-hidden">
        {/* Progress line on top */}
        <div className="h-0.5 bg-white/10">
          <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <button onClick={() => setFullscreenPlayer(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={upgradeArtwork(currentTrack.artworkUrl100, 80)}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.trackName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{currentTrack.artistName}</p>
            </div>
          </button>
          <button onClick={togglePlay} className="p-2 text-foreground flex-shrink-0">
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button onClick={nextTrack} className="p-2 text-foreground/70 flex-shrink-0">
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePlayerBar;
