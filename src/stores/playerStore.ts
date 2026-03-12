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
  ytStatus: string;

  _audioEl: HTMLAudioElement | null;
  _usingYT: boolean;
  _ytReady: boolean;
  _ytInitPromise: Promise<void> | null;
  _intervalId: number | null;

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
  ytStatus: 'not initialized',
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
    set({ _audioEl: audio, ytStatus: 'initializing...' });

    setYTCallbacks({
      onStateChange: (state) => {
        const s = get();
        if (!s._usingYT) return;

        if (state === YT_STATES.PLAYING) {
          const ytDur = ytGetDuration();
          set({
            isPlaying: true,
            isLoadingAudio: false,
            duration: ytDur > 0 ? ytDur : s.duration,
            ytStatus: 'playing',
          });
          s._startPolling();
        } else if (state === YT_STATES.PAUSED) {
          set({ isPlaying: false, ytStatus: 'paused' });
          s._stopPolling();
        } else if (state === YT_STATES.ENDED) {
          set({ ytStatus: 'ended' });
          s._handleTrackEnd();
        } else if (state === YT_STATES.BUFFERING) {
          set({ isLoadingAudio: true, ytStatus: 'buffering' });
        } else if (state === YT_STATES.UNSTARTED) {
          set({ ytStatus: 'unstarted' });
        }
      },
      onError: (code) => {
        console.error('[Qaisify] YT error, falling back to preview. Code:', code);
        const track = get().currentTrack;
        set({ ytStatus: `error: ${code}` });
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

    const promise = initYouTubePlayer()
      .then(() => {
        set({ _ytReady: true, ytStatus: 'ready ✅' });
        console.log('[Qaisify] Store: YT player ready');
      })
      .catch((err) => {
        set({ _ytReady: false, ytStatus: 'init failed ❌', isLoadingAudio: false });
        console.error('[Qaisify] YT init failed:', err);
      });
    set({ _ytInitPromise: promise });
  },

  playTrack: async (track, queue, index) => {
    const s = get();

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

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artwork: [{ src: track.artworkUrl100?.replace(/\d+x\d+bb/, '512x512bb') || '', sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    // Wait for YT init
    if (!get()._ytReady && get()._ytInitPromise) {
      set({ ytStatus: 'waiting for init...' });
      await get()._ytInitPromise;
    }

    const videoId = await searchYouTubeVideoId(track.trackName, track.artistName);

    if (videoId && get()._ytReady) {
      set({ _usingYT: true, usingYouTube: true, playbackSource: 'youtube', ytStatus: 'loading video...' });
      ytSetVolume(get().volume);
      if (get().isMuted) ytMute();
      else ytUnmute();

      const started = loadAndPlayYT(videoId);
      if (started) {
        // Pre-fetch next
        const q = get().queue;
        const qi = get().queueIndex;
        if (qi < q.length - 1) {
          searchYouTubeVideoId(q[qi + 1].trackName, q[qi + 1].artistName).catch(() => {});
        }
        return;
      }

      set({ ytStatus: 'loadVideo failed' });
    }

    // Fallback to preview
    console.warn('[Qaisify] Using 30s iTunes preview fallback');
    set({ _usingYT: false, usingYouTube: false, playbackSource: 'preview', ytStatus: 'using preview' });
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
      set({ ytStatus: 'waiting for init (test)...' });
      await s._ytInitPromise;
    }

    if (!get()._ytReady) {
      set({ ytStatus: 'YT not ready — cannot test' });
      return;
    }

    set({
      currentTrack: null,
      currentTime: 0,
      duration: 213,
      isLoadingAudio: true,
      isPlaying: false,
      _usingYT: true,
      usingYouTube: true,
      playbackSource: 'youtube',
      ytStatus: 'test: loading dQw4w9WgXcQ...',
    });

    ytSetVolume(get().volume);
    if (get().isMuted) ytMute();
    else ytUnmute();

    const started = loadAndPlayYT('dQw4w9WgXcQ');
    if (!started) {
      set({
        _usingYT: false,
        isLoadingAudio: false,
        isPlaying: false,
        usingYouTube: false,
        playbackSource: 'none',
        ytStatus: 'test: loadVideo failed ❌',
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
