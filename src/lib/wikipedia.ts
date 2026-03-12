const bioCache = new Map<string, { extract: string; thumbnail?: string } | null>();

export async function fetchArtistBio(artistName: string): Promise<{ extract: string; thumbnail?: string } | null> {
  if (bioCache.has(artistName)) return bioCache.get(artistName)!;

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(artistName)}`);
    if (!res.ok) {
      bioCache.set(artistName, null);
      return null;
    }
    const data = await res.json();
    const result = {
      extract: data.extract || '',
      thumbnail: data.thumbnail?.source,
    };
    bioCache.set(artistName, result);
    return result;
  } catch {
    bioCache.set(artistName, null);
    return null;
  }
}
