import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { fetchLyrics } from '@/lib/lyrics';
import { Music } from 'lucide-react';

const LyricsPanel = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTrack) { setLyrics(null); return; }
    setLoading(true);
    fetchLyrics(currentTrack.artistName, currentTrack.trackName).then((result) => {
      setLyrics(result);
      setLoading(false);
    });
  }, [currentTrack?.trackId]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <Music size={32} />
        <p className="text-sm">Play a song to see lyrics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-white/5 animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
        ))}
      </div>
    );
  }

  if (!lyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <Music size={32} />
        <p className="text-sm text-center">No lyrics found for<br />"{currentTrack.trackName}"</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Syne' }}>{currentTrack.trackName}</h3>
      <p className="text-xs text-muted-foreground mb-4">{currentTrack.artistName}</p>
      <div className="text-sm text-foreground/80 whitespace-pre-line leading-7">
        {lyrics}
      </div>
    </div>
  );
};

export default LyricsPanel;
