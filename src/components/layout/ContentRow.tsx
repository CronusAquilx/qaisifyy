import { ITunesTrack } from '@/lib/itunes';
import SongCard from '@/components/cards/SongCard';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentRowProps {
  title: string;
  emoji?: string;
  tracks: ITunesTrack[];
  loading?: boolean;
}

const ContentRow = ({ title, emoji, tracks, loading }: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-bold text-foreground">
          {emoji && <span className="mr-2">{emoji}</span>}
          {title}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scroll('right')} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[150px]">
              <div className="w-[150px] h-[150px] rounded-xl bg-white/5 animate-pulse mb-2" />
              <div className="h-3 w-24 bg-white/5 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
            </div>
          ))
        ) : (
          tracks.map((track, i) => (
            <SongCard key={`${track.trackId}-${i}`} track={track} tracks={tracks} index={i} />
          ))
        )}
      </div>
    </div>
  );
};

export default ContentRow;
