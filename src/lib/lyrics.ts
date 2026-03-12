const lyricsCache = new Map<string, string | null>();

export async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  const key = `${artist}::${title}`.toLowerCase();
  if (lyricsCache.has(key)) return lyricsCache.get(key)!;

  try {
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!res.ok) {
      lyricsCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const lyrics = data.lyrics || null;
    lyricsCache.set(key, lyrics);
    return lyrics;
  } catch {
    lyricsCache.set(key, null);
    return null;
  }
}
