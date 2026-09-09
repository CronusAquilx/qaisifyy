import { usePlayerStore } from '@/stores/playerStore';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Some networks / proxy-unblocker sites break the YouTube JS API (postMessage
 * origin mismatch, rewritten origins). In that case we drop the API entirely and
 * show a plain YouTube embed the user can press play on directly.
 */
const FallbackEmbed = () => {
  const fallbackVideoId = usePlayerStore((s) => s.fallbackVideoId);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!fallbackVideoId) return null;

  const isInsideProxy = window.self !== window.top;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(fallbackVideoId)}`;
  const embedParams = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    origin: window.location.origin,
    widget_referrer: window.location.href,
  });

  return (
    <div className="fixed bottom-[100px] right-4 z-[60] w-[320px] max-w-[90vw] rounded-xl overflow-hidden glass-elevated">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <p className="text-[11px] text-muted-foreground truncate">
          Press play here — {currentTrack?.trackName ?? 'track'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => usePlayerStore.setState({ fallbackVideoId: null })}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="Close player"
        >
          <X size={14} />
        </Button>
      </div>
      {isInsideProxy ? (
        <div className="flex flex-col items-start gap-3 border-t border-border/50 p-4">
          <p className="text-sm text-foreground">
            This proxy blocked YouTube's video player. Open the song outside the proxy to play it.
          </p>
          <Button asChild size="sm">
            <a href={watchUrl} target="_top" rel="noreferrer">
              <ExternalLink /> Open outside proxy
            </a>
          </Button>
        </div>
      ) : (
        <iframe
          key={fallbackVideoId}
          title="YouTube player"
          src={`https://www.youtube.com/embed/${fallbackVideoId}?${embedParams.toString()}`}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video border-0"
        />
      )}
    </div>
  );
};

export default FallbackEmbed;
