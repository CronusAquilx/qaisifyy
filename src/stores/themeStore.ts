import { create } from 'zustand';

export interface ThemePreset {
  id: string;
  name: string;
  bgBase: string;
  accentPrimary: string;
  accentSecondary: string;
  blob1: string;
  blob2: string;
  blob3: string;
  glowColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'midnight-void', name: 'Midnight Void', bgBase: '#060608', accentPrimary: '#7C3AED', accentSecondary: '#a78bfa', blob1: '#1a0533', blob2: '#0d0721', blob3: '#110022', glowColor: '#7C3AED' },
  { id: 'aurora', name: 'Aurora', bgBase: '#040d1a', accentPrimary: '#06d6a0', accentSecondary: '#845ef7', blob1: '#0d2137', blob2: '#071a2e', blob3: '#13084a', glowColor: '#06d6a0' },
  { id: 'solar-flare', name: 'Solar Flare', bgBase: '#0d0500', accentPrimary: '#f97316', accentSecondary: '#ec4899', blob1: '#2d0e00', blob2: '#1a0510', blob3: '#200a00', glowColor: '#f97316' },
  { id: 'arctic', name: 'Arctic', bgBase: '#030d17', accentPrimary: '#60a5fa', accentSecondary: '#e0f2fe', blob1: '#071f35', blob2: '#040f1e', blob3: '#0a2540', glowColor: '#60a5fa' },
  { id: 'forest-rave', name: 'Forest Rave', bgBase: '#010d04', accentPrimary: '#4ade80', accentSecondary: '#22d3ee', blob1: '#051a08', blob2: '#020d04', blob3: '#0a2010', glowColor: '#4ade80' },
  { id: 'rose-gold', name: 'Rose Gold', bgBase: '#0d0609', accentPrimary: '#f9a8d4', accentSecondary: '#fbbf24', blob1: '#2d0a18', blob2: '#1a0510', blob3: '#200a12', glowColor: '#f9a8d4' },
  { id: 'cyber-punk', name: 'Cyber Punk', bgBase: '#040408', accentPrimary: '#facc15', accentSecondary: '#f0abfc', blob1: '#1a1500', blob2: '#0d0020', blob3: '#200020', glowColor: '#facc15' },
  { id: 'obsidian', name: 'Obsidian', bgBase: '#000000', accentPrimary: '#ffffff', accentSecondary: '#a1a1aa', blob1: '#111111', blob2: '#0a0a0a', blob3: '#080808', glowColor: '#ffffff' },
];

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  const accent = hexToHsl(theme.accentPrimary);
  root.style.setProperty('--primary', accent);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--ring', accent);
  root.style.setProperty('--sidebar-primary', accent);
  root.style.setProperty('--sidebar-ring', accent);
  root.style.setProperty('--glow-primary', accent);
  root.style.setProperty('--bg-base', theme.bgBase);
  root.style.setProperty('--blob-1', theme.blob1);
  root.style.setProperty('--blob-2', theme.blob2);
  root.style.setProperty('--blob-3', theme.blob3);
}

interface ThemeState {
  activeThemeId: string;
  getActiveTheme: () => ThemePreset;
  setTheme: (id: string) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeThemeId: localStorage.getItem('qaisify_theme') || 'midnight-void',

  getActiveTheme: () => {
    return THEME_PRESETS.find(t => t.id === get().activeThemeId) || THEME_PRESETS[0];
  },

  setTheme: (id) => {
    const theme = THEME_PRESETS.find(t => t.id === id);
    if (!theme) return;
    applyTheme(theme);
    localStorage.setItem('qaisify_theme', id);
    set({ activeThemeId: id });
  },
}));

// Apply stored theme on load
const stored = localStorage.getItem('qaisify_theme') || 'midnight-void';
const theme = THEME_PRESETS.find(t => t.id === stored);
if (theme) applyTheme(theme);
