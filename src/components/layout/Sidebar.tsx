import { Home, Search, Library, BarChart3, Heart, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: BarChart3, label: 'Stats', path: '/stats' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-[90px] w-[72px] md:w-[240px] z-40 flex flex-col">
      {/* Logo */}
      <div className="p-4 md:px-5 md:py-5 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
          <span className="relative text-lg font-black text-primary" style={{ fontFamily: 'Syne' }}>Q</span>
        </div>
        <span className="hidden md:block text-lg font-bold text-foreground" style={{ fontFamily: 'Syne' }}>
          Qaisify
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 md:px-3 mt-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                active
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon size={20} />
              <span className="hidden md:block">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Library section */}
      <div className="mt-6 px-2 md:px-3 flex-1 overflow-hidden">
        <div className="glass rounded-xl p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Library
            </span>
            <button className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <button className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-muted-foreground hover:text-foreground w-full">
            <Heart size={16} className="text-primary" />
            <span className="hidden md:block">Liked Songs</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
