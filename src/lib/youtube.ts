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
  return new Promise((resolve, reject) => {
    if ((window as any).YT?.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }

    let settled = false;
    let checkInterval: number | null = null;

    const finish = (ok: boolean, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
      if (ok) {
        ytApiLoaded = true;
        resolve();
      } else {
        reject(error || new Error('YouTube IFrame API failed to initialize'));
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish(false, new Error('YouTube IFrame API load timeout'));
    }, 12000);

    const existing = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      try {
        existing?.();
      } catch {}
      console.log('[Qaisify] ✅ YouTube IFrame API script loaded');
      finish(true);
    };

    // If callback already fired before we attached, detect readiness via polling
    checkInterval = window.setInterval(() => {
      if ((window as any).YT?.Player) {
        console.log('[Qaisify] ✅ YouTube IFrame API detected from window.YT');
        finish(true);
      }
    }, 100);

    let script = document.querySelector('script[src*="youtube.com/iframe_api"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    script.addEventListener(
      'error',
      () => finish(false, new Error('Failed to load YouTube IFrame API script')),
      { once: true }
    );
  });
}

// Create the hidden player
function createPlayer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ytPlayer && ytPlayerReady) {
      resolve();
      return;
    }

    let settled = false;
    const finish = (ok: boolean, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (ok) resolve();
      else reject(error || new Error('YT.Player creation failed'));
    };

    // Container — keep in viewport with real dimensions for audio autoplay policy
    let container = document.getElementById('yt-player-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-player-container';
      document.body.appendChild(container);
    }
    container.style.cssText =
      'position:fixed;bottom:0;right:0;width:320px;height:180px;' +
      'opacity:0.01;pointer-events:none;z-index:-1;';

    // Player div
    let playerDiv = document.getElementById('yt-hidden-player');
    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.id = 'yt-hidden-player';
      container.appendChild(playerDiv);
    }

    const timeoutId = window.setTimeout(() => {
      console.error('[Qaisify] YT.Player creation timeout');
      finish(false, new Error('YT.Player creation timeout'));
    }, 12000);

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
            console.log('[Qaisify] ✅ YT.Player ready — audio should work!');
            finish(true);
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
      console.error('[Qaisify] YT.Player constructor error:', err);
      finish(false, err instanceof Error ? err : new Error('YT.Player constructor error'));
    }
  });
}

export async function initYouTubePlayer(): Promise<void> {
  await loadYTApi();
  await createPlayer();
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
