const YT_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() || '';

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

export function getYouTubeApiKeyPreview(): string {
  if (!YT_API_KEY) return 'Missing';
  return `${YT_API_KEY.slice(0, 8)}...`;
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
    `${artistName} ${trackName}`,
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

// ── YouTube IFrame Player (YT.Player) ──────────────────────────────
let ytPlayer: any = null;
let ytPlayerReady = false;
let ytApiLoaded = false;
let stateChangeCb: ((state: number) => void) | null = null;
let errorCb: ((code: number) => void) | null = null;

// Load the IFrame API script
function loadYTApi(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).YT?.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }

    const existing = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      existing?.();
      ytApiLoaded = true;
      console.log('[Qaisify] ✅ YouTube IFrame API script loaded');
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

// Create the hidden player
function createPlayer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ytPlayer && ytPlayerReady) {
      resolve();
      return;
    }

    // Container — must be in viewport with real dimensions for audio to work
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      container.style.cssText =
        'position:fixed;bottom:0;right:0;width:320px;height:180px;' +
        'opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(container);
    }

    // Player div
    let playerDiv = document.getElementById('yt-hidden-player');
    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.id = 'yt-hidden-player';
      container.appendChild(playerDiv);
    }

    const timeout = setTimeout(() => {
      console.warn('[Qaisify] YT.Player creation timeout — continuing anyway');
      resolve();
    }, 30000);

    try {
      ytPlayer = new (window as any).YT.Player('yt-hidden-player', {
        height: '180',
        width: '320',
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
            console.log('[Qaisify] ✅ YT.Player ready — audio should work!');
            resolve();
          },
          onStateChange: (e: any) => {
            console.log('[Qaisify] YT state:', e.data);
            stateChangeCb?.(e.data);
          },
          onError: (e: any) => {
            console.error('[Qaisify] YT player error code:', e.data);
            errorCb?.(e.data);
          },
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      console.error('[Qaisify] YT.Player constructor error:', err);
      reject(err);
    }
  });
}

export async function initYouTubePlayer(): Promise<void> {
  try {
    await loadYTApi();
    await createPlayer();
  } catch (err) {
    console.error('[Qaisify] YouTube init error:', err);
  }
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
    console.warn('[Qaisify] YT.Player not ready — cannot play', { ytPlayer: !!ytPlayer, ytPlayerReady });
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
export function isYTReady(): boolean { return ytPlayerReady && ytPlayer !== null; }

export const YT_STATES = {
  UNSTARTED: -1, ENDED: 0, PLAYING: 1,
  PAUSED: 2, BUFFERING: 3, CUED: 5,
};
