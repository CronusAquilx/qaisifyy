export interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
  primaryGenreName: string;
  releaseDate: string;
  trackExplicitness: string;
  trackNumber: number;
  collectionId: number;
  artistId: number;
}

export interface ITunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string;
  primaryGenreName: string;
}

function upgradeArtwork(url: string, size = 600): string {
  if (!url) return '';
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

export { upgradeArtwork };

const cache = new Map<string, any>();

async function fetchWithCache(url: string) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export async function searchSongs(query: string, limit = 25): Promise<ITunesTrack[]> {
  const data = await fetchWithCache(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}&country=us`
  );
  return data.results || [];
}

export async function searchArtists(query: string, limit = 10): Promise<ITunesArtist[]> {
  const data = await fetchWithCache(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=${limit}`
  );
  return data.results || [];
}

export async function searchAlbums(query: string, limit = 20) {
  const data = await fetchWithCache(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=${limit}&country=us`
  );
  return data.results || [];
}

export async function getAlbumTracks(collectionId: number): Promise<ITunesTrack[]> {
  const data = await fetchWithCache(
    `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`
  );
  return (data.results || []).filter((r: any) => r.wrapperType === 'track');
}

export async function getTopSongs(limit = 100): Promise<ITunesTrack[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`);
    const data = await res.json();
    const entries = data?.feed?.entry || [];
    return entries.map((e: any) => ({
      trackId: parseInt(e.id?.attributes?.['im:id'] || '0'),
      trackName: e['im:name']?.label || '',
      artistName: e['im:artist']?.label || '',
      collectionName: e['im:collection']?.['im:name']?.label || '',
      artworkUrl100: e['im:image']?.[2]?.label || '',
      previewUrl: e.link?.find((l: any) => l.attributes?.type?.includes('audio'))?.attributes?.href || '',
      trackTimeMillis: 0,
      primaryGenreName: e.category?.attributes?.label || '',
      releaseDate: e['im:releaseDate']?.label || '',
      trackExplicitness: '',
      trackNumber: 0,
      collectionId: 0,
      artistId: 0,
    }));
  } catch (err) {
    console.error('[Qaisify] Top songs fetch error:', err);
    return [];
  }
}

export async function getGenreSongs(term: string, limit = 25): Promise<ITunesTrack[]> {
  return searchSongs(term, limit);
}

export async function getArtistTopSongs(artistName: string, limit = 25): Promise<ITunesTrack[]> {
  return searchSongs(artistName, limit);
}

export function formatDuration(ms: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDurationSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
