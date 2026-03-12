import { ITunesTrack, upgradeArtwork } from '@/lib/itunes';
import { usePlayerStore } from '@/stores/playerStore';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface SongCardProps {
  track: ITunesTrack;
  tracks?: ITunesTrack[];
  index?: number;
}

const SongCard = ({ track, tracks, index }: SongCardProps) => {
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  const isActive = currentTrack?.trackId === track.trackId;
  const artwork = upgradeArtwork(track.artworkUrl100, 300);

  const handlePlay = () => {
    playTrack(track, tracks || [track], index ?? 0);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="card-shimmer flex-shrink-0 w-[150px] cursor-pointer group"
      onClick={handlePlay}
    >
      <div className="relative rounded-xl overflow-hidden mb-2">
        <img
          src={artwork}
          alt={track.trackName}
          className="w-[150px] h-[150px] object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <Play size={18} fill="white" className="ml-0.5" />
          </motion.div>
        </div>
        {isActive && isPlaying && (
          <div className="absolute bottom-2 right-2 flex gap-0.5">
            {[1,2,3].map(i => (
              <div key={i} className="w-1 bg-primary rounded-full animate-pulse" style={{
                height: `${8 + Math.random() * 8}px`,
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        )}
      </div>
      <p className="text-[13px] font-medium text-foreground truncate">{track.trackName}</p>
      <p className="text-[12px] text-muted-foreground truncate">{track.artistName}</p>
      {track.trackExplicitness === 'explicit' && (
        <span className="inline-block mt-0.5 px-1 text-[9px] bg-white/10 rounded text-muted-foreground">E</span>
      )}
    </motion.div>
  );
};

export default SongCard;
