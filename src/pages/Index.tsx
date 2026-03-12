import { useEffect, useState } from 'react';
import { searchSongs, type ITunesTrack } from '@/lib/itunes';
import ContentRow from '@/components/layout/ContentRow';

interface GenreRow {
  title: string;
  emoji: string;
  term: string;
  limit?: number;
}

const genreRows: GenreRow[] = [
  { title: 'Hip-Hop & Rap', emoji: '🔥', term: 'hip hop rap 2024', limit: 25 },
  { title: 'R&B & Soul', emoji: '🎤', term: 'rnb soul 2024', limit: 25 },
  { title: 'Top Pop Hits', emoji: '🎵', term: 'pop hits 2024', limit: 25 },
  { title: 'Afrobeats', emoji: '🌍', term: 'afrobeats 2024', limit: 25 },
  { title: 'Electronic & EDM', emoji: '⚡', term: 'electronic edm', limit: 25 },
  { title: 'Lo-Fi & Chill', emoji: '😴', term: 'lofi chill beats', limit: 25 },
  { title: 'Workout Bangers', emoji: '💪', term: 'workout gym music', limit: 25 },
  { title: 'Late Night R&B', emoji: '🌙', term: 'late night rnb', limit: 25 },
  { title: 'Rock', emoji: '🤘', term: 'rock 2024', limit: 25 },
  { title: 'Latin & Reggaeton', emoji: '🌎', term: 'reggaeton latin 2024', limit: 25 },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const Index = () => {
  const [rows, setRows] = useState<Record<string, ITunesTrack[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.all(
        genreRows.map(async (row) => {
          try {
            const tracks = await searchSongs(row.term, row.limit);
            return { key: row.term, tracks };
          } catch {
            return { key: row.term, tracks: [] };
          }
        })
      );
      const map: Record<string, ITunesTrack[]> = {};
      results.forEach(r => { map[r.key] = r.tracks; });
      setRows(map);
      setLoading(false);
    };
    fetchAll();
  }, []);

  return (
    <div className="p-4 md:p-6 pb-32">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6" style={{ fontFamily: 'Syne' }}>
        {getGreeting()} ✨
      </h1>

      {genreRows.map((row) => (
        <ContentRow
          key={row.term}
          title={row.title}
          emoji={row.emoji}
          tracks={rows[row.term] || []}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default Index;
