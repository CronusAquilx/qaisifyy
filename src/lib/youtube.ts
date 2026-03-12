const YT_API_KEY = 'AIzaSyCc5PPxKMk7-hqMK284HwnMISd13wIF15Y';

// Video ID cache
const vidCache = new Map<string, string>();
try {
  const saved = JSON.parse(localStorage.getItem('qaisify_vid_cache') || '{}');
  Object.entries(saved).forEach(([k, v]) => vidCache.set(k, v as string));
} catch {}

function saveCache() {
  const obj: Record<string, string> = {};
  vidCache.forEach((v, k) => { obj[k] = v; });
  try { localStorage.setItem('qaisify_vid_cache', JSON.stringify(obj)); } catch {}
}

export async function searchYouTubeVideoId(
  trackName: string,
  artistName: string
): Promise<string | null> {
  const cacheKey = `${trackName}::${artistName}`.toLowerCase().trim();
  if (vidCache.has(cacheKey)) return vidCache.get(cacheKey)!;
  if (!YT_API_KEY) {
    console.error('[Qaisify] YouTube API key is missing!');
    return null;
  }

  const queries = [
    `${artistName} ${trackName} official audio`,
    `${artistName} ${trackName} audio`,
    `${artistName} ${trackName} official video`,
    `${artistName} ${trackName}`,
    `${trackName} full song`,
  ];

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search`
        + `?part=snippet&q=${encodeURIComponent(query)}`
        + `&type=video&videoCategoryId=10&maxResults=3`
        + `&key=${YT_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[Qaisify] YouTube API error ${res.status}:`, await res.text());
        continue;
      }
      const data = await res.json();
      if (data.items?.length > 0) {
        const videoId = data.items[0].id?.videoId;
        if (videoId) {
          vidCache.set(cacheKey, videoId);
          saveCache();
          console.log(`[Qaisify] ✅ Found YouTube video: ${videoId} for "${trackName}"`);
          return videoId;
        }
      }
    } catch (err) {
      console.error('[Qaisify] YouTube search error:', err);
    }
  }
  console.warn(`[Qaisify] ❌ No YouTube video found for "${trackName}" by "${artistName}"`);
  return null;
}

// YouTube IFrame Player singleton
let ytPlayer: any = null;
let ytPlayerReady = false;
let ytInitPromise: Promise<void> | null = null;
let stateChangeCb: ((state: number) => void) | null = null;
let errorCb: ((code: number) => void) | null = null;

export function initYouTubePlayer(): Promise<void> {
  if (ytInitPromise) return ytInitPromise;
  ytInitPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('YouTube player init timeout'));
    }, 15000);

    const createPlayer = () => {
      let container = document.getElementById('yt-player-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'yt-player-container';
        container.style.cssText =
          'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;' +
          'overflow:hidden;pointer-events:none;z-index:-1;';
        document.body.appendChild(container);
        const playerDiv = document.createElement('div');
        playerDiv.id = 'yt-hidden-player';
        container.appendChild(playerDiv);
      }

      if (ytPlayer) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      ytPlayer = new (window as any).YT.Player('yt-hidden-player', {
        height: '1',
        width: '1',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ytPlayerReady = true;
            clearTimeout(timeout);
            console.log('[Qaisify] ✅ YouTube IFrame Player ready!');
            resolve();
          },
          onStateChange: (e: any) => stateChangeCb?.(e.data),
          onError: (e: any) => {
            console.error('[Qaisify] YouTube player error:', e.data);
            errorCb?.(e.data);
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      const existing = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        existing?.();
        createPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.insertBefore(tag, document.head.firstChild);
      }
    }
  });
  return ytInitPromise;
}

export function setYTCallbacks(callbacks: {
  onStateChange?: (state: number) => void;
  onError?: (code: number) => void;
}) {
  stateChangeCb = callbacks.onStateChange || null;
  errorCb = callbacks.onError || null;
}

export function loadAndPlayYT(videoId: string): boolean {
  if (!ytPlayer || !ytPlayerReady) {
    console.warn('[Qaisify] YouTube player not ready yet');
    return false;
  }
  try {
    ytPlayer.loadVideoById({ videoId, suggestedQuality: 'small' });
    console.log(`[Qaisify] ▶ Loading YouTube video: ${videoId}`);
    return true;
  } catch (err) {
    console.error('[Qaisify] loadVideoById error:', err);
    return false;
  }
}

export function ytPlay() { try { ytPlayer?.playVideo?.(); } catch {} }
export function ytPause() { try { ytPlayer?.pauseVideo?.(); } catch {} }
export function ytStop() { try { ytPlayer?.stopVideo?.(); } catch {} }
export function ytSeekTo(s: number) { try { ytPlayer?.seekTo?.(s, true); } catch {} }
export function ytSetVolume(v: number) { try { ytPlayer?.setVolume?.(Math.round(v * 100)); } catch {} }
export function ytMute() { try { ytPlayer?.mute?.(); } catch {} }
export function ytUnmute() { try { ytPlayer?.unMute?.(); } catch {} }
export function ytGetCurrentTime(): number { try { return ytPlayer?.getCurrentTime?.() || 0; } catch { return 0; } }
export function ytGetDuration(): number { try { return ytPlayer?.getDuration?.() || 0; } catch { return 0; } }
export function ytSetPlaybackRate(rate: number) { try { ytPlayer?.setPlaybackRate?.(rate); } catch {} }
export function isYTReady(): boolean { return ytPlayerReady && ytPlayer !== null; }

export const YT_STATES = {
  UNSTARTED: -1, ENDED: 0, PLAYING: 1,
  PAUSED: 2, BUFFERING: 3, CUED: 5,
};
