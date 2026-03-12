const JAMENDO_CLIENT_ID = '3a06e802';

const trackCache = new Map<string, JamendoTrack | null>();

export interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  album_name: string;
  audio: string; // direct MP3 URL
  audiodownload: string;
  image: string;
  duration: number; // seconds
}

export async function searchJamendo(
  trackName: string,
  artistName: string
): Promise<JamendoTrack | null> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase().trim();
  if (trackCache.has(cacheKey)) return trackCache.get(cacheKey)!;

  const queries = [
    `${artistName} ${trackName}`,
    trackName,
  ];

  for (const query of queries) {
    try {
      const url =
        `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
        `&format=json&limit=5&search=${encodeURIComponent(query)}` +
        `&include=musicinfo&audioformat=mp32`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[Qaisify] Jamendo API error ${res.status}`);
        continue;
      }

      const data = await res.json();
      const results = data.results as JamendoTrack[] | undefined;

      if (results && results.length > 0) {
        const track = results[0];
        trackCache.set(cacheKey, track);
        console.log(`[Qaisify] ✅ Jamendo match: "${track.name}" by ${track.artist_name}`);
        return track;
      }
    } catch (err) {
      console.error('[Qaisify] Jamendo search error:', err);
    }
  }

  console.warn(`[Qaisify] ❌ No Jamendo match for "${trackName}" by "${artistName}"`);
  trackCache.set(cacheKey, null);
  return null;
}

export async function getJamendoPopular(limit = 20): Promise<JamendoTrack[]> {
  try {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
      `&format=json&limit=${limit}&order=popularity_week&audioformat=mp32`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.results as JamendoTrack[]) || [];
  } catch {
    return [];
  }
}
