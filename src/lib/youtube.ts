const YOUTUBE_API_KEY = 'AIzaSyCc5PPxKMk7-hqMK284HwnMISd13wIF15Y';

const videoCache = new Map<string, string | null>();
const LS_CACHE_KEY = 'qaisify_yt_cache';

// Load persisted cache from localStorage
try {
  const stored = localStorage.getItem(LS_CACHE_KEY);
  if (stored) {
    const entries = JSON.parse(stored) as [string, string | null][];
    entries.forEach(([k, v]) => videoCache.set(k, v));
  }
} catch {}

function persistCache() {
  try {
    const entries = Array.from(videoCache.entries()).slice(-200); // keep last 200
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

export async function searchYouTubeVideo(
  trackName: string,
  artistName: string
): Promise<string | null> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase().trim();
  if (videoCache.has(cacheKey)) return videoCache.get(cacheKey)!;

  const query = `${artistName} ${trackName} official audio`;

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&type=video&videoCategoryId=10&maxResults=3` +
      `&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[Qaisify] YouTube API error ${res.status}`);
      videoCache.set(cacheKey, null);
      persistCache();
      return null;
    }

    const data = await res.json();
    const items = data.items as { id: { videoId: string }; snippet: { title: string } }[];

    if (items && items.length > 0) {
      const videoId = items[0].id.videoId;
      console.log(`[Qaisify] ✅ YouTube match: "${items[0].snippet.title}" (${videoId})`);
      videoCache.set(cacheKey, videoId);
      persistCache();
      return videoId;
    }
  } catch (err) {
    console.error('[Qaisify] YouTube search error:', err);
  }

  console.warn(`[Qaisify] ❌ No YouTube match for "${trackName}" by "${artistName}"`);
  videoCache.set(cacheKey, null);
  persistCache();
  return null;
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

    (window as any).onYouTubeIframeAPIReady = () => {
      iframeApiLoaded = true;
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });

  return iframeApiPromise;
}
