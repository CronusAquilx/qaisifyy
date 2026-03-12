import { create } from 'zustand';
import type { ITunesTrack } from '@/lib/itunes';
import { searchJamendo } from '@/lib/jamendo';

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackSource = 'jamendo' | 'preview' | 'none';

interface PlayerState {
  currentTrack: ITunesTrack | null;
  queue: ITunesTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  isLoadingAudio: boolean;
  playbackSource: PlaybackSource;

  _audioEl: HTMLAudioElement | null;
  _intervalId: number | null;

  init: () => void;
  playTrack: (track: ITunesTrack, queue?: ITunesTrack[], index?: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: ITunesTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  _startPolling: () => void;
  _stopPolling: () => void;
  _handleTrackEnd: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: parseFloat(localStorage.getItem('qaisify_volume') || '0.7'),
  isMuted: false,
  shuffle: false,
  repeat: 'off',
  isLoadingAudio: false,
  playbackSource: 'none',
  _audioEl: null,
  _intervalId: null,

  init: () => {
    if (get()._audioEl) return;
    const audio = new Audio();
    audio.addEventListener('ended', () => get()._handleTrackEnd());
    audio.addEventListener('loadedmetadata', () => {
      set({ duration: audio.duration, isLoadingAudio: false });
    });
    audio.addEventListener('error', () => {
      console.error('[Qaisify] Audio element error');
      set({ isLoadingAudio: false });
    });
    audio.volume = get().volume;
    set({ _audioEl: audio });
  },

  playTrack: async (track, queue, index) => {
    const s = get();
    s._stopPolling();

    const audio = s._audioEl;
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    const newQueue = queue || s.queue;
    const newIndex = index ?? newQueue.findIndex((t) => t.trackId === track.trackId);
    const trackDuration = track.trackTimeMillis ? track.trackTimeMillis / 1000 : 0;

    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: newIndex >= 0 ? newIndex : 0,
      currentTime: 0,
      duration: trackDuration,
      isLoadingAudio: true,
      isPlaying: false,
      playbackSource: 'none',
    });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artwork: [{ src: track.artworkUrl100?.replace(/\d+x\d+bb/, '512x512bb') || '', sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    // Try Jamendo first for full-length track
    const jamendoTrack = await searchJamendo(track.trackName, track.artistName);

    if (jamendoTrack?.audio && audio) {
      console.log(`[Qaisify] ▶ Playing full track via Jamendo: ${jamendoTrack.name}`);
      set({ playbackSource: 'jamendo' });
      audio.src = jamendoTrack.audio;
      audio.volume = get().volume;
      audio.muted = get().isMuted;
      audio.play().catch(() => {});
      set({ isPlaying: true, isLoadingAudio: false });
      get()._startPolling();

      // Pre-fetch next
      const q = get().queue;
      const qi = get().queueIndex;
      if (qi < q.length - 1) {
        searchJamendo(q[qi + 1].trackName, q[qi + 1].artistName).catch(() => {});
      }
      return;
    }

    // Fallback to iTunes 30s preview
    console.warn('[Qaisify] Using 30s iTunes preview fallback');
    set({ playbackSource: 'preview' });
    if (audio && track.previewUrl) {
      audio.src = track.previewUrl;
      audio.volume = get().volume;
      audio.muted = get().isMuted;
      audio.play().catch(() => {});
      set({ isPlaying: true, isLoadingAudio: false });
      get()._startPolling();
    } else {
      set({ isLoadingAudio: false, isPlaying: false });
    }
  },

  togglePlay: () => {
    const s = get();
    if (!s.currentTrack) return;
    if (s.isPlaying) {
      s._audioEl?.pause();
      set({ isPlaying: false });
      s._stopPolling();
    } else {
      s._audioEl?.play().catch(() => {});
      set({ isPlaying: true });
      s._startPolling();
    }
  },

  nextTrack: () => {
    const s = get();
    const { queue, queueIndex, shuffle, repeat } = s;
    if (queue.length === 0) {
      set({ isPlaying: false, isLoadingAudio: false });
      return;
    }
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else {
      set({ isPlaying: false, isLoadingAudio: false });
      return;
    }
    s.playTrack(queue[nextIndex], queue, nextIndex);
  },

  prevTrack: () => {
    const s = get();
    if (s.currentTime > 3) {
      s.seekTo(0);
      return;
    }
    const { queue, queueIndex } = s;
    if (queue.length === 0) return;
    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    s.playTrack(queue[prevIndex], queue, prevIndex);
  },

  seekTo: (time) => {
    const audio = get()._audioEl;
    if (audio) audio.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const audio = get()._audioEl;
    if (audio) audio.volume = clamped;
    localStorage.setItem('qaisify_volume', String(clamped));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const s = get();
    const newMuted = !s.isMuted;
    if (s._audioEl) s._audioEl.muted = newMuted;
    set({ isMuted: newMuted });
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set((s) => ({
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
  })),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  removeFromQueue: (index) => set((s) => ({
    queue: s.queue.filter((_, i) => i !== index),
  })),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  _startPolling: () => {
    const s = get();
    if (s._intervalId) return;
    const id = window.setInterval(() => {
      const audio = get()._audioEl;
      if (audio) {
        set({
          currentTime: audio.currentTime,
          duration: audio.duration || get().duration,
        });
      }
    }, 250);
    set({ _intervalId: id });
  },

  _stopPolling: () => {
    const id = get()._intervalId;
    if (id) {
      clearInterval(id);
      set({ _intervalId: null });
    }
  },

  _handleTrackEnd: () => {
    const s = get();
    if (s.repeat === 'one' && s.currentTrack) {
      s.playTrack(s.currentTrack, s.queue, s.queueIndex);
    } else {
      s.nextTrack();
    }
  },
}));
