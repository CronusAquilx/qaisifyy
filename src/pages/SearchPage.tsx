import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchSongs, searchAlbums, type ITunesTrack, upgradeArtwork, formatDuration } from '@/lib/itunes';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Search } from 'lucide-react';

const genres = [
  { name: 'Hip-Hop/Rap', color: 'from-orange-600 to-red-700' },
  { name: 'R&B/Soul', color: 'from-purple-600 to-pink-600' },
  { name: 'Pop', color: 'from-pink-500 to-rose-500' },
  { name: 'Rock', color: 'from-red-700 to-orange-600' },
  { name: 'Electronic', color: 'from-cyan-500 to-blue-600' },
  { name: 'Afrobeats', color: 'from-green-600 to-emerald-500' },
  { name: 'Latin', color: 'from-yellow-500 to-orange-500' },
  { name: 'Lo-Fi', color: 'from-indigo-500 to-purple-600' },
  { name: 'Jazz', color: 'from-amber-600 to-yellow-700' },
  { name: 'Classical', color: 'from-slate-500 to-gray-600' },
  { name: 'K-Pop', color: 'from-pink-400 to-violet-500' },
  { name: 'Country', color: 'from-amber-700 to-orange-800' },
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    if (!q) { setResults([]); setAlbums([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const [tracks, albs] = await Promise.all([
        searchSongs(q, 30),
        searchAlbums(q, 6),
      ]);
      setResults(tracks);
      setAlbums(albs.filter((a: any) => a.collectionType === 'Album'));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  };

  return (
    <div className="p-4 md:p-6 pb-32">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative max-w-xl mx-auto">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); if (e.target.value) setSearchParams({ q: e.target.value }); }}
            placeholder="Search songs, artists, albums..."
            className="w-full glass-input pl-12 pr-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground outline-none rounded-2xl"
            autoFocus
          />
        </div>
      </form>

      {!q && (
        <>
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Syne' }}>Browse All</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {genres.map(g => (
              <button
                key={g.name}
                onClick={() => { setQuery(g.name); setSearchParams({ q: g.name }); }}
                className={`glass rounded-xl p-4 text-left h-24 bg-gradient-to-br ${g.color} border-none hover:scale-[1.02] transition-transform`}
              >
                <span className="text-sm font-bold text-white">{g.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Syne' }}>Songs</h2>
          {results.map((track, i) => {
            const isActive = currentTrack?.trackId === track.trackId;
            return (
              <button
                key={`${track.trackId}-${i}`}
                onClick={() => playTrack(track, results, i)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5 group ${
                  isActive ? 'bg-white/10' : ''
                }`}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={upgradeArtwork(track.artworkUrl100, 100)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                    <Play size={14} fill="white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.trackName}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDuration(track.trackTimeMillis)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
