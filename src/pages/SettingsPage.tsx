import { useState } from 'react';
import { useThemeStore, THEME_PRESETS } from '@/stores/themeStore';
import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import {
  Palette, Volume2, Shield, Bell, Accessibility, Database, Info,
  Moon, Timer, Keyboard, ArrowLeft, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion';

type Section = 'appearance' | 'audio' | 'shortcuts' | 'sleep' | 'cache' | 'about';

const sections = [
  { id: 'appearance' as Section, icon: Palette, label: 'Appearance' },
  { id: 'audio' as Section, icon: Volume2, label: 'Audio & Playback' },
  { id: 'shortcuts' as Section, icon: Keyboard, label: 'Keyboard Shortcuts' },
  { id: 'sleep' as Section, icon: Timer, label: 'Sleep Timer' },
  { id: 'cache' as Section, icon: Database, label: 'Storage & Cache' },
  { id: 'about' as Section, icon: Info, label: 'About Qaisify' },
];

const shortcuts = [
  { keys: 'Space', action: 'Play / Pause' },
  { keys: 'Ctrl + →', action: 'Next Track' },
  { keys: 'Ctrl + ←', action: 'Previous Track' },
  { keys: 'Ctrl + Shift + →', action: 'Forward 10s' },
  { keys: 'Ctrl + Shift + ←', action: 'Back 10s' },
  { keys: 'M', action: 'Mute / Unmute' },
  { keys: 'S', action: 'Toggle Shuffle' },
  { keys: 'R', action: 'Toggle Repeat' },
  { keys: 'F', action: 'Full-screen Player' },
  { keys: 'Esc', action: 'Close Overlay' },
  { keys: 'Ctrl + F', action: 'Search' },
  { keys: 'Ctrl + Shift + Q', action: 'Toggle Queue' },
  { keys: 'Ctrl + Shift + L', action: 'Toggle Lyrics' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('appearance');
  const { activeThemeId, setTheme } = useThemeStore();
  const { sleepTimer, setSleepTimer } = useUIStore();
  const player = usePlayerStore();

  const [crossfade, setCrossfade] = useState(parseInt(localStorage.getItem('qaisify_crossfade') || '0'));
  const [playbackSpeed, setPlaybackSpeed] = useState(parseFloat(localStorage.getItem('qaisify_speed') || '1'));

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('qaisify_speed', String(speed));
    const yt = player._ytPlayer;
    if (yt?.setPlaybackRate) yt.setPlaybackRate(speed);
  };

  const clearCache = () => {
    const keys = ['qaisify_yt_cache_v3', 'qaisify_vid_cache', 'qaisify_volume', 'qaisify_theme'];
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-6 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 glass-button rounded-full">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-52 flex-shrink-0">
          {sections.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === id ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {THEME_PRESETS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      className={`relative glass rounded-xl p-3 text-left transition-all hover:scale-[1.02] ${
                        activeThemeId === theme.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="w-4 h-4 rounded-full" style={{ background: theme.accentPrimary }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: theme.accentSecondary }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: theme.bgBase, border: '1px solid rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-xs font-medium">{theme.name}</p>
                      {activeThemeId === theme.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={12} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'audio' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Playback Speed</h3>
                <div className="flex gap-2 flex-wrap">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        playbackSpeed === speed ? 'bg-primary text-primary-foreground' : 'glass-button'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Crossfade</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">0s</span>
                  <Slider
                    value={[crossfade]}
                    max={12}
                    step={1}
                    onValueChange={([v]) => { setCrossfade(v); localStorage.setItem('qaisify_crossfade', String(v)); }}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">12s</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Current: {crossfade}s</p>
              </div>
            </motion.div>
          )}

          {activeSection === 'shortcuts' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Keyboard Shortcuts</h3>
                <div className="space-y-2">
                  {shortcuts.map(({ keys, action }) => (
                    <div key={keys} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-sm text-foreground/80">{action}</span>
                      <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs font-mono text-muted-foreground">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'sleep' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Sleep Timer</h3>
                {sleepTimer !== null ? (
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-primary" style={{ fontFamily: 'Syne' }}>{sleepTimer}m</p>
                    <p className="text-sm text-muted-foreground mt-1">remaining</p>
                    <button onClick={() => setSleepTimer(null)} className="glass-button px-4 py-2 rounded-full text-sm mt-4">
                      Cancel Timer
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => setSleepTimer(mins)}
                        className="glass-button px-4 py-3 rounded-xl text-sm font-medium"
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'cache' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'Syne' }}>Storage & Cache</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">YouTube Video Cache</p>
                      <p className="text-xs text-muted-foreground">Cached video IDs for faster playback</p>
                    </div>
                    <button onClick={clearCache} className="glass-button px-3 py-1.5 rounded-lg text-xs">Clear All</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'about' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass rounded-xl p-5 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
                  <span className="relative text-3xl font-black text-primary" style={{ fontFamily: 'Syne' }}>Q</span>
                </div>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Syne' }}>Qaisify</h3>
                <p className="text-sm text-muted-foreground mt-1">Music. Reimagined in Glass.</p>
                <p className="text-xs text-muted-foreground mt-4">Version 1.0.0</p>
                <p className="text-xs text-muted-foreground mt-1">Built with ❤️ using React, TypeScript & Liquid Glass</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
