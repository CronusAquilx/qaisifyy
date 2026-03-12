import { usePlayerStore } from '@/stores/playerStore';
import { useUIStore } from '@/stores/uiStore';
import { upgradeArtwork, formatDurationSeconds } from '@/lib/itunes';
import { X, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, MicVocal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { useEffect, useState } from 'react';
import { fetchLyrics } from '@/lib/lyrics';

const FullscreenPlayer = () => {
  const { isFullscreenPlayer, setFullscreenPlayer, setRightPanelTab } = useUIStore();
  const {
    currentTrack, isPlaying, currentTime, duration,
    volume, isMuted, shuffle, repeat,
    togglePlay, nextTrack, prevTrack, seekTo,
    setVolume, toggleMute, toggleShuffle, toggleRepeat,
  } = usePlayerStore();

  const [lyrics, setLyrics] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    if (!currentTrack) return;
    fetchLyrics(currentTrack.artistName, currentTrack.trackName).then(setLyrics);
  }, [currentTrack?.trackId]);

  if (!currentTrack) return null;

  const art = upgradeArtwork(currentTrack.artworkUrl100, 600);

  return (
    <AnimatePresence>
      {isFullscreenPlayer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col"
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${art})`, filter: 'blur(60px) brightness(0.2) saturate(1.5)', transform: 'scale(1.3)' }}
          />
          <div className="absolute inset-0 bg-black/40" />

          {/* Close */}
          <button
            onClick={() => setFullscreenPlayer(false)}
            className="absolute top-4 right-4 z-10 p-2 glass-button rounded-full"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-8 p-6 overflow-y-auto">
            {/* Album Art */}
            <motion.img
              src={art}
              alt=""
              className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-2xl shadow-2xl object-cover"
              animate={{ scale: isPlaying ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Info + Controls */}
            <div className="flex flex-col items-center md:items-start gap-4 max-w-md w-full">
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Syne' }}>{currentTrack.trackName}</h2>
                <p className="text-lg text-muted-foreground mt-1">{currentTrack.artistName}</p>
                <p className="text-sm text-muted-foreground/60 mt-0.5">{currentTrack.collectionName}</p>
              </div>

              {/* Progress */}
              <div className="w-full flex flex-col gap-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.5}
                  onValueChange={([v]) => seekTo(v)}
                  className="w-full cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{formatDurationSeconds(currentTime)}</span>
                  <span>{formatDurationSeconds(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-5">
                <button onClick={toggleShuffle} className={`p-2 rounded-full ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Shuffle size={20} />
                </button>
                <button onClick={prevTrack} className="p-2 text-foreground/80 hover:text-foreground">
                  <SkipBack size={24} fill="currentColor" />
                </button>
                <motion.button
                  onClick={togglePlay}
                  whileTap={{ scale: 0.92 }}
                  className="w-16 h-16 rounded-full glass-button flex items-center justify-center"
                  style={{ boxShadow: isPlaying ? '0 0 30px rgba(124,58,237,0.4)' : undefined }}
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </motion.button>
                <button onClick={nextTrack} className="p-2 text-foreground/80 hover:text-foreground">
                  <SkipForward size={24} fill="currentColor" />
                </button>
                <button onClick={toggleRepeat} className={`p-2 rounded-full ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 w-full">
                <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={([v]) => setVolume(v)}
                  className="flex-1"
                />
              </div>

              {/* Lyrics toggle */}
              <button
                onClick={() => setShowLyrics(!showLyrics)}
                className={`glass-button px-4 py-2 rounded-full text-sm flex items-center gap-2 ${showLyrics ? 'text-primary' : ''}`}
              >
                <MicVocal size={14} /> {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
              </button>

              {showLyrics && lyrics && (
                <div className="glass rounded-xl p-4 max-h-48 overflow-y-auto w-full">
                  <p className="text-sm text-foreground/70 whitespace-pre-line leading-6">{lyrics}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenPlayer;
