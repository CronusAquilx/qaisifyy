import { create } from 'zustand';
import type { ITunesTrack } from '@/lib/itunes';
import {
  initYouTubePlayer,
  searchYouTubeVideoId,
  loadAndPlayYT,
  setYTCallbacks,
  ytPlay,
  ytPause,
  ytStop,
  ytSeekTo,
  ytSetVolume,
  ytMute,
  ytUnmute,
  ytGetCurrentTime,
  ytGetDuration,
  YT_STATES,
} from '@/lib/youtube';

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackSource = 'youtube' | 'preview' | 'none';

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
  usingYouTube: boolean;
  playbackSource: PlaybackSource;

  // internal
  _audioEl: HTMLAudioElement | null;
  _usingYT: boolean;
  _ytReady: boolean;
  _ytInitPromise: Promise<void> | null;
  _intervalId: number | null;

  // actions
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
  usingYouTube: false,
  playbackSource: 'none',
  _audioEl: null,
  _usingYT: false,
  _ytReady: false,
  _ytInitPromise: null,
  _intervalId: null,

  init: () => {
    const audio = new Audio();
    audio.addEventListener('ended', () => get()._handleTrackEnd());
    audio.addEventListener('loadedmetadata', () => {
      set({ duration: audio.duration, isLoadingAudio: false });
    });
    audio.volume = get().volume;
    set({ _audioEl: audio });

    const promise = initYouTubePlayer()
      .then(() => {
        set({ _ytReady: true });
        setYTCallbacks({
          onStateChange: (state) => {
            const s = get();
            if (state === YT_STATES.PLAYING) {
              set({ isPlaying: true, isLoadingAudio: false, duration: ytGetDuration() });
              s._startPolling();
            } else if (state === YT_STATES.PAUSED) {
              set({ isPlaying: false });
              s._stopPolling();
            } else if (state === YT_STATES.ENDED) {
              s._handleTrackEnd();
            } else if (state === YT_STATES.BUFFERING) {
              set({ isLoadingAudio: true });
            }
          },
          onError: (code) => {
            console.error('[Qaisify] YT error, falling back to preview', code);
            const track = get().currentTrack;
            if (track?.previewUrl) {
              const audio = get()._audioEl;
              if (audio) {
                set({ _usingYT: false, usingYouTube: false, playbackSource: 'preview' });
                audio.src = track.previewUrl;
                audio.play().catch(() => {});
                set({ isPlaying: true, isLoadingAudio: false });
                get()._startPolling();
              }
            }
          },
        });
      })
      .catch((err) => console.error('[Qaisify] YT init failed:', err));
    set({ _ytInitPromise: promise });
  },

  playTrack: async (track, queue, index) => {
    const s = get();

    // Stop current
    s._stopPolling();
    if (s._usingYT) ytStop();
    if (s._audioEl) {
      s._audioEl.pause();
      s._audioEl.src = '';
    }

    const newQueue = queue || s.queue;
    const newIndex = index ?? newQueue.findIndex(t => t.trackId === track.trackId);

    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: newIndex >= 0 ? newIndex : 0,
      currentTime: 0,
      duration: 0,
      isLoadingAudio: true,
      isPlaying: false,
    });

    // Media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artwork: [{ src: track.artworkUrl100?.replace(/\d+x\d+bb/, '512x512bb') || '', sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    // Try YouTube first
    if (!s._ytReady && s._ytInitPromise) {
      await s._ytInitPromise;
    }

    const videoId = await searchYouTubeVideoId(track.trackName, track.artistName);

    if (videoId) {
      const vol = get().volume;
      ytSetVolume(vol);
      if (get().isMuted) ytMute();
      const started = loadAndPlayYT(videoId);
      if (started) {
        set({ _usingYT: true, usingYouTube: true, playbackSource: 'youtube' });
        // Pre-fetch next
        const q = get().queue;
        const qi = get().queueIndex;
        if (qi < q.length - 1) {
          const next = q[qi + 1];
          searchYouTubeVideoId(next.trackName, next.artistName).catch(() => {});
        }
        return;
      }
      // YT player not ready, fall through to preview
      console.warn('[Qaisify] YT player not ready, using preview fallback');
    }

    // Fallback to preview
    console.warn('[Qaisify] Falling back to 30s iTunes preview');
    set({ _usingYT: false, usingYouTube: false, playbackSource: 'preview' });
    const audio = get()._audioEl;
    if (audio && track.previewUrl) {
      audio.src = track.previewUrl;
      audio.volume = get().volume;
      audio.muted = get().isMuted;
      audio.play().catch(() => {});
      set({ isPlaying: true });
      get()._startPolling();
    } else {
      set({ isLoadingAudio: false });
    }
  },

  togglePlay: () => {
    const s = get();
    if (!s.currentTrack) return;
    if (s.isPlaying) {
      if (s._usingYT) ytPause();
      else s._audioEl?.pause();
      set({ isPlaying: false });
      s._stopPolling();
    } else {
      if (s._usingYT) ytPlay();
      else s._audioEl?.play().catch(() => {});
      set({ isPlaying: true });
      s._startPolling();
    }
  },

  nextTrack: () => {
    const s = get();
    const { queue, queueIndex, shuffle, repeat } = s;
    if (queue.length === 0) return;

    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else {
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
    const s = get();
    if (s._usingYT) ytSeekTo(time);
    else if (s._audioEl) s._audioEl.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const s = get();
    if (s._usingYT) ytSetVolume(clamped);
    if (s._audioEl) s._audioEl.volume = clamped;
    localStorage.setItem('qaisify_volume', String(clamped));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const s = get();
    const newMuted = !s.isMuted;
    if (s._usingYT) newMuted ? ytMute() : ytUnmute();
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
      const st = get();
      if (st._usingYT) {
        set({
          currentTime: ytGetCurrentTime(),
          duration: ytGetDuration() || st.duration,
        });
      } else if (st._audioEl) {
        set({
          currentTime: st._audioEl.currentTime,
          duration: st._audioEl.duration || st.duration,
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
