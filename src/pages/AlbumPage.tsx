import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAlbumTracks, upgradeArtwork, formatDuration, type ITunesTrack } from '@/lib/itunes';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Shuffle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const AlbumPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<ITunesTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack } = usePlayerStore();

  useEffect(() => {
    if (!collectionId) return;
    setLoading(true);
    getAlbumTracks(parseInt(collectionId)).then((t) => {
      setTracks(t);
      setLoading(false);
    });
  }, [collectionId]);

  const album = tracks[0];
  const heroArt = album ? upgradeArtwork(album.artworkUrl100, 600) : '';
  const totalMs = tracks.reduce((sum, t) => sum + (t.trackTimeMillis || 0), 0);

  return (
    <div className="pb-32">
      {/* Hero */}
      <div className="p-6 pt-16 flex flex-col md:flex-row items-center md:items-end gap-6 relative">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 glass-button rounded-full z-10">
          <ArrowLeft size={18} />
        </button>
        {heroArt && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroArt})`, filter: 'blur(60px) brightness(0.2) saturate(1.5)', transform: 'scale(1.3)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/50 to-transparent" />
        <img
          src={heroArt}
          alt=""
          className="w-48 h-48 md:w-56 md:h-56 rounded-xl shadow-2xl relative z-10 object-cover"
        />
        <div className="relative z-10 text-center md:text-left">
          <p className="text-xs text-primary font-medium mb-1">Album</p>
          <h1 className="text-2xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Syne' }}>{album?.collectionName || 'Loading...'}</h1>
          <p className="text-sm text-muted-foreground">
            <button onClick={() => navigate(`/artist/${encodeURIComponent(album?.artistName || '')}`)} className="hover:text-foreground hover:underline transition-colors">
              {album?.artistName}
            </button>
            {' · '}{new Date(album?.releaseDate || '').getFullYear()}
            {' · '}{tracks.length} songs
            {' · '}{formatDuration(totalMs)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 py-4 relative z-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => tracks.length > 0 && playTrack(tracks[0], tracks, 0)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Play size={18} fill="currentColor" /> Play
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            if (shuffled.length > 0) playTrack(shuffled[0], shuffled, 0);
          }}
          className="glass-button px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
        >
          <Shuffle size={16} /> Shuffle
        </motion.button>
      </div>

      {/* Track List */}
      <div className="px-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          tracks.map((track, i) => {
            const isActive = currentTrack?.trackId === track.trackId;
            return (
              <button
                key={track.trackId}
                onClick={() => playTrack(track, tracks, i)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-white/5 group ${isActive ? 'bg-white/10' : ''}`}
              >
                <span className="w-6 text-right text-xs text-muted-foreground">{track.trackNumber || i + 1}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.trackName}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                </div>
                {track.trackExplicitness === 'explicit' && (
                  <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded font-bold text-muted-foreground">E</span>
                )}
                <span className="text-xs text-muted-foreground">{formatDuration(track.trackTimeMillis)}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlbumPage;
