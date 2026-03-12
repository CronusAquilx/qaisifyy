import { Search, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const TopBar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 glass" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="flex gap-1">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-black/30 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-full bg-black/30 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full glass-input pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </form>

      <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors relative">
        <Bell size={18} />
      </button>

      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer">
        Q
      </div>
    </div>
  );
};

export default TopBar;
