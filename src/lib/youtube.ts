const YOUTUBE_API_KEY = 'AIzaSyCc5PPxKMk7-hqMK284HwnMISd13wIF15Y';

const videoCache = new Map<string, string[]>();
const LS_CACHE_KEY = 'qaisify_yt_cache_v4';

/**
 * Verify videos are actually playable in an embed: embeddable, public,
 * processed, and not region-blocked for US. Search filters aren't reliable.
 */
async function verifyPlayable(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=status,contentDetails&id=${ids.join(',')}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return ids;
    const data = await res.json();
    const ok = new Set<string>();
    for (const v of (data.items ?? []) as any[]) {
      const status = v?.status ?? {};
      if (status.embeddable !== true) continue;
      if (status.privacyStatus !== 'public') continue;
      if (status.uploadStatus && status.uploadStatus !== 'processed') continue;
      const rr = v?.contentDetails?.regionRestriction;
      if (rr?.blocked?.includes('US')) continue;
      if (rr?.allowed && !rr.allowed.includes('US')) continue;
      ok.add(v.id);
    }
    // preserve original search relevance order
    return ids.filter((id) => ok.has(id));
  } catch {
    return ids;
  }
}


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

    const rawIds = Array.from(
      new Set(
        (items ?? [])
          .map((item) => item?.id?.videoId)
          .filter((videoId): videoId is string => typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId))
      )
    ).slice(0, 10);

    // The search filters lie fairly often — verify each video is really
    // embeddable, public and not region-blocked before we try to play it.
    const candidates = (await verifyPlayable(rawIds)).slice(0, 5);

    if (candidates.length > 0) {
      console.log(`[Qaisify] ✅ YouTube match: ${candidates[0]} (${candidates.length} playable candidates)`);
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
