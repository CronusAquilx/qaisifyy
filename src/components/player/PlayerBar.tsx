import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDurationSeconds, upgradeArtwork } from '@/lib/itunes';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, MicVocal, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import YouTubeEmbed from '@/components/player/YouTubeEmbed';

const PlayerBar = () => {
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, shuffle, repeat,
    isLoadingAudio, playbackSource, isNetworkBlocked,
    togglePlay, nextTrack, prevTrack, seekTo,
    setVolume, toggleMute, toggleShuffle, toggleRepeat,
  } = usePlayerStore();

  const { setFullscreenPlayer, setRightPanelTab, rightPanelOpen, rightPanelTab } = useUIStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[90px] glass-elevated" style={{ borderRadius: '0' }}>
      <div className="flex items-center h-full px-4 gap-4">
        {/* LEFT - Track info */}
        <div className="flex items-center gap-3 w-[30%] min-w-0">
          <YouTubeEmbed />
          {currentTrack ? (
            <div className="min-w-0 flex-1">
              <button
                onClick={() => setFullscreenPlayer(true)}
                className="text-left w-full"
              >
                <p className="text-sm font-medium text-foreground truncate hover:underline">
                  {currentTrack.trackName}
                </p>
                <p className="text-xs text-muted-foreground truncate hover:underline">
                  {currentTrack.artistName}
                </p>
              </button>
              <AnimatePresence>
                {isNetworkBlocked && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive"
                  >
                    Your network is blocking YouTube playback
                  </motion.span>
                )}
                {!isNetworkBlocked && playbackSource === 'youtube' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400"
                  >
                    ▶ YouTube
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No track playing</p>
          )}
        </div>

        {/* CENTER - Controls */}
        <div className="flex flex-col items-center gap-1 w-[40%]">
          <div className="flex items-center gap-3">
            <button onClick={toggleShuffle} className={`p-1.5 rounded-full transition-all ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Shuffle size={16} />
            </button>
            <button onClick={prevTrack} className="p-1.5 text-foreground/80 hover:text-foreground transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <motion.button
              onClick={togglePlay}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.06 }}
              className="w-10 h-10 rounded-full glass-button flex items-center justify-center relative"
              style={{ boxShadow: isPlaying ? '0 0 20px rgba(124,58,237,0.4)' : undefined }}
            >
              {isLoadingAudio ? (
                <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="ml-0.5" />
              )}
            </motion.button>
            <button onClick={nextTrack} className="p-1.5 text-foreground/80 hover:text-foreground transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button onClick={toggleRepeat} className={`p-1.5 rounded-full transition-all ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{formatDurationSeconds(currentTime)}</span>
            <Slider value={[currentTime]} max={duration || 100} step={0.5} onValueChange={([v]) => seekTo(v)} className="flex-1 cursor-pointer" />
            <span className="text-[11px] text-muted-foreground tabular-nums w-10">{formatDurationSeconds(duration)}</span>
          </div>
        </div>

        {/* RIGHT - Actions + Volume */}
        <div className="flex items-center justify-end gap-2 w-[30%]">
          <button
            onClick={() => setRightPanelTab('lyrics')}
            className={`p-1.5 rounded-full transition-all ${rightPanelOpen && rightPanelTab === 'lyrics' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MicVocal size={16} />
          </button>
          <button
            onClick={() => setRightPanelTab('queue')}
            className={`p-1.5 rounded-full transition-all ${rightPanelOpen && rightPanelTab === 'queue' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ListMusic size={16} />
          </button>
          <button
            onClick={() => setFullscreenPlayer(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 size={16} />
          </button>
          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <Slider value={[isMuted ? 0 : volume]} max={1} step={0.01} onValueChange={([v]) => setVolume(v)} className="w-20" />
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
