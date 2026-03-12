import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { upgradeArtwork } from '@/lib/itunes';
import { X, Play, Pause, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

const MiniPlayer = () => {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, nextTrack } = usePlayerStore();
  const { setFullscreenPlayer } = useUIStore();
  const [visible, setVisible] = useState(true);

  if (!currentTrack || !visible) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-24 right-4 z-[60] md:hidden"
      style={{ touchAction: 'none' }}
    >
      <div className="glass-elevated rounded-2xl overflow-hidden w-[220px]" onClick={() => setFullscreenPlayer(true)}>
        <div className="flex items-center gap-2 p-2">
          <img
            src={upgradeArtwork(currentTrack.artworkUrl100, 80)}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{currentTrack.trackName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artistName}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-1.5 text-foreground"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextTrack(); }}
            className="p-1.5 text-foreground"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
        </div>
        {/* Progress line */}
        <div className="h-0.5 bg-white/10">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.div>
  );
};

export default MiniPlayer;
