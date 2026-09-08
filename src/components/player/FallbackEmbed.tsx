import { usePlayerStore } from '@/stores/playerStore';
import { X } from 'lucide-react';

/**
 * Some networks / proxy-unblocker sites break the YouTube JS API (postMessage
 * origin mismatch, rewritten origins). In that case we drop the API entirely and
 * show a plain YouTube embed the user can press play on directly.
 */
const FallbackEmbed = () => {
  const fallbackVideoId = usePlayerStore((s) => s.fallbackVideoId);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!fallbackVideoId) return null;

  return (
    <div className="fixed bottom-[100px] right-4 z-[60] w-[320px] max-w-[90vw] rounded-xl overflow-hidden glass-elevated">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <p className="text-[11px] text-muted-foreground truncate">
          Press play here — {currentTrack?.trackName ?? 'track'}
        </p>
        <button
          onClick={() => usePlayerStore.setState({ fallbackVideoId: null })}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close player"
        >
          <X size={14} />
        </button>
      </div>
      <iframe
        key={fallbackVideoId}
        title="YouTube player"
        src={`https://www.youtube.com/embed/${fallbackVideoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video border-0"
      />
    </div>
  );
};

export default FallbackEmbed;
