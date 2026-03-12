const YT_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() || '';

// Video ID cache
const vidCache = new Map<string, string>();
try {
  const saved = JSON.parse(localStorage.getItem('qaisify_vid_cache') || '{}');
  Object.entries(saved).forEach(([k, v]) => vidCache.set(k, v as string));
} catch {}

function saveCache() {
  const obj: Record<string, string> = {};
  vidCache.forEach((v, k) => {
    obj[k] = v;
  });
  try {
    localStorage.setItem('qaisify_vid_cache', JSON.stringify(obj));
  } catch {}
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

type YTCallbacks = {
  onReady?: () => void;
  onError?: () => void;
};

let ytIframe: HTMLIFrameElement | null = null;
let ytIframeReady = false;
let pendingVideoId: string | null = null;
let readyCb: (() => void) | null = null;
let errorCb: (() => void) | null = null;

function buildEmbedUrl(videoId: string): string {
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&playsinline=1&enablejsapi=1&origin=${origin}&rel=0&ts=${Date.now()}`;
}

function postCommand(func: string, args: unknown[] = []) {
  if (!ytIframe?.contentWindow) return;
  ytIframe.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    '*'
  );
}

function ensureHiddenIframe(): HTMLIFrameElement {
  let container = document.getElementById('yt-player-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'yt-player-container';
    // Keep in viewport but invisible — browsers block audio on off-screen/tiny iframes
    container.style.cssText =
      'position:fixed;bottom:0;left:0;width:320px;height:180px;' +
      'pointer-events:none;z-index:-1;opacity:0.01;';
    document.body.appendChild(container);
  }

  const existing = document.getElementById('yt-hidden-embed') as HTMLIFrameElement | null;
  if (existing) {
    ytIframe = existing;
    return existing;
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'yt-hidden-embed';
  iframe.width = '320';
  iframe.height = '180';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText = 'border:none;';
  iframe.src = 'about:blank';

  iframe.addEventListener('load', () => {
    if (!pendingVideoId) return;
    ytIframeReady = true;

    // Give embed time to initialize, then nudge playback + volume
    setTimeout(() => {
      postCommand('playVideo');
      postCommand('unMute');
      readyCb?.();
      pendingVideoId = null;
    }, 500);
  });

  iframe.addEventListener('error', () => {
    ytIframeReady = false;
    errorCb?.();
  });

  container.appendChild(iframe);
  ytIframe = iframe;
  return iframe;
}

export function initYouTubePlayer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureHiddenIframe();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export function setYTCallbacks(callbacks: YTCallbacks) {
  readyCb = callbacks.onReady || null;
  errorCb = callbacks.onError || null;
}

export function loadAndPlayYT(videoId: string): boolean {
  if (!videoId) return false;

  try {
    const iframe = ensureHiddenIframe();
    ytIframeReady = false;
    pendingVideoId = videoId;
    iframe.src = buildEmbedUrl(videoId);
    console.log(`[Qaisify] ▶ Loading hidden YouTube embed: ${videoId}`);
    return true;
  } catch (err) {
    console.error('[Qaisify] loadAndPlayYT error:', err);
    return false;
  }
}

export function ytPlay() {
  postCommand('playVideo');
}

export function ytPause() {
  postCommand('pauseVideo');
}

export function ytStop() {
  postCommand('stopVideo');
}

export function ytSeekTo(s: number) {
  postCommand('seekTo', [Math.max(0, s), true]);
}

export function ytSetVolume(v: number) {
  postCommand('setVolume', [Math.round(Math.max(0, Math.min(1, v)) * 100)]);
}

export function ytMute() {
  postCommand('mute');
}

export function ytUnmute() {
  postCommand('unMute');
}

export function isYTReady(): boolean {
  return ytIframeReady && ytIframe !== null;
}
