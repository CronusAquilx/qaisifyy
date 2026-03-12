import { usePlayerStore } from '@/stores/playerStore';
import { upgradeArtwork } from '@/lib/itunes';
import { Play, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QueuePanel = () => {
  const { currentTrack, queue, queueIndex, playTrack, removeFromQueue, clearQueue } = usePlayerStore();

  const upcoming = queue.slice(queueIndex + 1);

  return (
    <div className="flex flex-col h-full">
      {/* Now Playing */}
      {currentTrack && (
        <div className="p-4 border-b border-white/10">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Now Playing</h3>
          <div className="flex items-center gap-3">
            <img
              src={upgradeArtwork(currentTrack.artworkUrl100, 120)}
              alt=""
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.trackName}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Next Up ({upcoming.length})
          </h3>
          {upcoming.length > 0 && (
            <button onClick={clearQueue} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        <AnimatePresence>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Queue is empty</p>
          ) : (
            upcoming.map((track, i) => {
              const actualIndex = queueIndex + 1 + i;
              return (
                <motion.div
                  key={`${track.trackId}-${actualIndex}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group transition-colors"
                >
                  <button
                    onClick={() => playTrack(track, queue, actualIndex)}
                    className="relative w-9 h-9 rounded overflow-hidden flex-shrink-0"
                  >
                    <img src={upgradeArtwork(track.artworkUrl100, 80)} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                      <Play size={12} fill="white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{track.trackName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{track.artistName}</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(actualIndex)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QueuePanel;
