const YOUTUBE_API_KEY = 'AIzaSyCc5PPxKMk7-hqMK284HwnMISd13wIF15Y';

const videoCache = new Map<string, string[]>();
const LS_CACHE_KEY = 'qaisify_yt_cache_v3';

// Load persisted cache from localStorage
try {
  const stored = localStorage.getItem(LS_CACHE_KEY);
  if (stored) {
    const entries = JSON.parse(stored) as [string, string[]][];
    entries.forEach(([k, v]) => videoCache.set(k, Array.isArray(v) ? v : []));
  }
} catch {}

function persistCache() {
  try {
    const entries = Array.from(videoCache.entries()).slice(-200); // keep last 200
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

export async function searchYouTubeCandidates(
  trackName: string,
  artistName: string
): Promise<string[]> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase().trim();
  if (videoCache.has(cacheKey)) return videoCache.get(cacheKey)!;

  const query = `${artistName} ${trackName}`;

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&type=video&videoCategoryId=10&maxResults=15` +
      `&videoEmbeddable=true&videoSyndicated=true` +
      `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Qaisify] YouTube API error ${res.status}`);
      videoCache.set(cacheKey, []);
      persistCache();
      return [];
    }

    const data = await res.json();
    const items = data.items as { id: { videoId?: string }; snippet: { title: string } }[];

    const candidates = Array.from(
      new Set(
        (items ?? [])
          .map((item) => item?.id?.videoId)
          .filter((videoId): videoId is string => typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId))
      )
    ).slice(0, 5);

    if (candidates.length > 0) {
      console.log(`[Qaisify] ✅ YouTube match: "${items[0].snippet.title}" (${candidates[0]})`);
      videoCache.set(cacheKey, candidates);
      persistCache();
      return candidates;
    }
  } catch (err) {
    console.error('[Qaisify] YouTube search error:', err);
  }

  console.warn(`[Qaisify] ❌ No YouTube match for "${trackName}" by "${artistName}"`);
  videoCache.set(cacheKey, []);
  persistCache();
  return [];
}

export async function searchYouTubeVideo(
  trackName: string,
  artistName: string
): Promise<string | null> {
  const candidates = await searchYouTubeCandidates(trackName, artistName);
  return candidates[0] ?? null;
}

// Load the IFrame API script once
let iframeApiLoaded = false;
let iframeApiPromise: Promise<void> | null = null;

export function loadYouTubeIFrameAPI(): Promise<void> {
  if (iframeApiLoaded) return Promise.resolve();
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise<void>((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      iframeApiLoaded = true;
      resolve();
      return;
    }

    const previousReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      iframeApiLoaded = true;
      resolve();
    };

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });

  return iframeApiPromise;
}
