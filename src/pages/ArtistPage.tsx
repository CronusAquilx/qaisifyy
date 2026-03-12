import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { searchSongs, searchAlbums, upgradeArtwork, formatDuration, type ITunesTrack } from '@/lib/itunes';
import { fetchArtistBio } from '@/lib/wikipedia';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Shuffle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const ArtistPage = () => {
  const { artistName } = useParams();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<ITunesTrack[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [bio, setBio] = useState<{ extract: string; thumbnail?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    if (!artistName) return;
    setLoading(true);
    Promise.all([
      searchSongs(artistName, 20),
      searchAlbums(artistName, 10),
      fetchArtistBio(artistName),
    ]).then(([s, a, b]) => {
      setSongs(s);
      setAlbums(a.filter((al: any) => al.collectionType === 'Album'));
      setBio(b);
      setLoading(false);
    });
  }, [artistName]);

  const heroArt = songs[0]?.artworkUrl100 ? upgradeArtwork(songs[0].artworkUrl100, 600) : '';

  return (
    <div className="pb-32">
      {/* Hero */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {heroArt && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroArt})`, filter: 'blur(40px) brightness(0.3) saturate(1.5)', transform: 'scale(1.2)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent" />
        <div className="relative z-10 flex items-end h-full p-6 gap-4">
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 glass-button rounded-full">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs text-primary font-medium mb-1">Artist</p>
            <h1 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: 'Syne' }}>{decodeURIComponent(artistName || '')}</h1>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 py-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => songs.length > 0 && playTrack(songs[0], songs, 0)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Play size={18} fill="currentColor" /> Play
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            const shuffled = [...songs].sort(() => Math.random() - 0.5);
            if (shuffled.length > 0) playTrack(shuffled[0], shuffled, 0);
          }}
          className="glass-button px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
        >
          <Shuffle size={16} /> Shuffle
        </motion.button>
      </div>

      <div className="px-6 space-y-8">
        {/* Popular Songs */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'Syne' }}>Popular</h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            songs.slice(0, 10).map((track, i) => {
              const isActive = currentTrack?.trackId === track.trackId;
              return (
                <button
                  key={track.trackId}
                  onClick={() => playTrack(track, songs, i)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5 group ${isActive ? 'bg-white/10' : ''}`}
                >
                  <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
                  <img src={upgradeArtwork(track.artworkUrl100, 80)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.collectionName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDuration(track.trackTimeMillis)}</span>
                </button>
              );
            })
          )}
        </section>

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'Syne' }}>Discography</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {albums.map((album: any) => (
                <button
                  key={album.collectionId}
                  onClick={() => navigate(`/album/${album.collectionId}`)}
                  className="glass rounded-xl p-3 text-left hover:bg-white/10 transition-all group"
                >
                  <img
                    src={upgradeArtwork(album.artworkUrl100, 300)}
                    alt=""
                    className="w-full aspect-square rounded-lg object-cover mb-2"
                  />
                  <p className="text-sm font-medium truncate">{album.collectionName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(album.releaseDate).getFullYear()}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {bio && (
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: 'Syne' }}>About</h2>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-foreground/80 leading-relaxed">{bio.extract}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ArtistPage;
