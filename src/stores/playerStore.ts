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
  testYouTube: () => void;
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
    if (get()._audioEl) return;

    const audio = new Audio();
    audio.addEventListener('ended', () => get()._handleTrackEnd());
    audio.addEventListener('loadedmetadata', () => {
      set({ duration: audio.duration, isLoadingAudio: false });
    });
    audio.volume = get().volume;
    set({ _audioEl: audio });

    setYTCallbacks({
      onReady: () => {
        const s = get();
        if (!s._usingYT) return;

        const trackDuration = s.currentTrack?.trackTimeMillis
          ? s.currentTrack.trackTimeMillis / 1000
          : s.duration;

        set({
          usingYouTube: true,
          playbackSource: 'youtube',
          isPlaying: true,
          isLoadingAudio: false,
          duration: trackDuration || s.duration,
        });

        ytSetVolume(s.volume);
        if (s.isMuted) ytMute();
        else ytUnmute();
        ytPlay();
        s._startPolling();
      },
      onError: () => {
        const s = get();
        if (!s._usingYT) return;
        console.error('[Qaisify] Hidden YouTube embed failed to load');
        s._stopPolling();
        set({
          _usingYT: false,
          usingYouTube: false,
          playbackSource: 'none',
          isLoadingAudio: false,
          isPlaying: false,
        });
      },
    });

    const promise = initYouTubePlayer()
      .then(() => set({ _ytReady: true }))
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
      usingYouTube: false,
      playbackSource: 'none',
      _usingYT: false,
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

    if (!s._ytReady && s._ytInitPromise) {
      await s._ytInitPromise;
    }

    const videoId = await searchYouTubeVideoId(track.trackName, track.artistName);

    if (videoId) {
      set({ _usingYT: true, isLoadingAudio: true, currentTime: 0, duration: trackDuration });
      const started = loadAndPlayYT(videoId);
      if (started) {
        // Pre-fetch next
        const q = get().queue;
        const qi = get().queueIndex;
        if (qi < q.length - 1) {
          const next = q[qi + 1];
          searchYouTubeVideoId(next.trackName, next.artistName).catch(() => {});
        }
        return;
      }

      console.warn('[Qaisify] YouTube embed failed to start for found videoId');
      set({ _usingYT: false, isLoadingAudio: false, isPlaying: false });
      return;
    }

    // Fallback ONLY when no YouTube video is found
    console.warn('[Qaisify] No YouTube videoId found, falling back to 30s iTunes preview');
    set({ _usingYT: false, usingYouTube: false, playbackSource: 'preview' });
    const audio = get()._audioEl;
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

  testYouTube: async () => {
    const s = get();

    s._stopPolling();
    if (s._usingYT) ytStop();
    if (s._audioEl) {
      s._audioEl.pause();
      s._audioEl.src = '';
    }

    if (!s._ytReady && s._ytInitPromise) {
      await s._ytInitPromise;
    }

    set({
      currentTrack: null,
      currentTime: 0,
      duration: 213,
      isLoadingAudio: true,
      isPlaying: false,
      usingYouTube: false,
      playbackSource: 'none',
      _usingYT: true,
    });

    const started = loadAndPlayYT('dQw4w9WgXcQ');
    if (!started) {
      set({
        _usingYT: false,
        isLoadingAudio: false,
        isPlaying: false,
        usingYouTube: false,
        playbackSource: 'none',
      });
    }
  },

  togglePlay: () => {
    const s = get();
    if (!s.currentTrack && !s._usingYT) return;

    if (s.isPlaying) {
      if (s._usingYT) ytPause();
      else s._audioEl?.pause();
      set({ isPlaying: false });
      s._stopPolling();
      return;
    }

    if (s._usingYT) ytPlay();
    else s._audioEl?.play().catch(() => {});
    set({ isPlaying: true });
    s._startPolling();
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
    const s = get();
    const clamped = Math.max(0, Math.min(time, s.duration || time));
    if (s._usingYT) ytSeekTo(clamped);
    else if (s._audioEl) s._audioEl.currentTime = clamped;
    set({ currentTime: clamped });
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

    if (s._usingYT) {
      if (newMuted) ytMute();
      else ytUnmute();
    }

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
        if (!st.isPlaying) return;

        const duration = st.currentTrack?.trackTimeMillis
          ? st.currentTrack.trackTimeMillis / 1000
          : st.duration;

        const nextTime = st.currentTime + 0.25;

        if (duration > 0 && nextTime >= duration) {
          set({ currentTime: duration });
          st._stopPolling();
          st._handleTrackEnd();
          return;
        }

        set({
          currentTime: nextTime,
          duration: duration || st.duration,
        });
        return;
      }

      if (st._audioEl) {
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
      return;
    }
    s.nextTrack();
  },
}));
