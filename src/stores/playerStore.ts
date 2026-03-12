import { create } from 'zustand';
import type { ITunesTrack } from '@/lib/itunes';
import { searchJamendo } from '@/lib/jamendo';
import { searchYouTubeVideo } from '@/lib/youtube';

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackSource = 'youtube' | 'jamendo' | 'preview' | 'none';

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
  _ytPlayer: any | null;
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
  _setYTPlayer: (player: any) => void;
  _startPolling: () => void;
  _stopPolling: () => void;
  _handleTrackEnd: () => void;
  _fallbackFromYouTube: () => void;
  _playViaJamendoOrPreview: (track: ITunesTrack) => Promise<void>;
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
  _ytPlayer: null,
  _intervalId: null,

  init: () => {
    if (get()._audioEl) return;
    const audio = new Audio();
    audio.addEventListener('ended', () => get()._handleTrackEnd());
    audio.addEventListener('loadedmetadata', () => {
      if (get().playbackSource !== 'youtube') {
        set({ duration: audio.duration, isLoadingAudio: false });
      }
    });
    audio.addEventListener('error', () => {
      if (get().playbackSource !== 'youtube') {
        console.error('[Qaisify] Audio element error');
        set({ isLoadingAudio: false });
      }
    });
    audio.volume = get().volume;
    set({ _audioEl: audio });
  },

  _setYTPlayer: (player) => set({ _ytPlayer: player }),

  playTrack: async (track, queue, index) => {
    const s = get();
    s._stopPolling();

    // Stop audio element
    const audio = s._audioEl;
    if (audio) {
      audio.pause();
      audio.src = '';
    }

    // Stop YouTube if playing
    const yt = s._ytPlayer;
    if (yt?.stopVideo) {
      try { yt.stopVideo(); } catch {}
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

    // Media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artwork: [{ src: track.artworkUrl100?.replace(/\d+x\d+bb/, '512x512bb') || '', sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    // 1. Try YouTube first
    const videoId = await searchYouTubeVideo(track.trackName, track.artistName);
    const ytPlayer = get()._ytPlayer;

    if (videoId && ytPlayer?.loadVideoById) {
      console.log(`[Qaisify] ▶ Playing via YouTube: ${videoId}`);
      set({ playbackSource: 'youtube' });
      try {
        ytPlayer.loadVideoById(videoId);
        ytPlayer.setVolume(get().volume * 100);
        if (get().isMuted) ytPlayer.mute(); else ytPlayer.unMute();
        set({ isPlaying: true, isLoadingAudio: false });
        get()._startPolling();

        // Pre-fetch next
        const q = get().queue;
        const qi = get().queueIndex;
        if (qi < q.length - 1) {
          searchYouTubeVideo(q[qi + 1].trackName, q[qi + 1].artistName).catch(() => {});
        }
        return;
      } catch (err) {
        console.error('[Qaisify] YouTube playback failed, falling back', err);
      }
    }

    // 2. Fallback to Jamendo / iTunes preview
    await get()._playViaJamendoOrPreview(track);
  },

  _fallbackFromYouTube: async () => {
    const s = get();
    if (!s.currentTrack) return;
    console.warn('[Qaisify] YouTube failed, trying Jamendo/Preview fallback');
    await s._playViaJamendoOrPreview(s.currentTrack);
  },

  _playViaJamendoOrPreview: async (track) => {
    const s = get();
    const audio = s._audioEl;

    // Try Jamendo
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

    if (s.playbackSource === 'youtube' && s._ytPlayer) {
      if (s.isPlaying) {
        s._ytPlayer.pauseVideo();
        set({ isPlaying: false });
        s._stopPolling();
      } else {
        s._ytPlayer.playVideo();
        set({ isPlaying: true });
        s._startPolling();
      }
      return;
    }

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
    const s = get();
    if (s.playbackSource === 'youtube' && s._ytPlayer?.seekTo) {
      s._ytPlayer.seekTo(time, true);
    } else {
      const audio = s._audioEl;
      if (audio) audio.currentTime = time;
    }
    set({ currentTime: time });
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    const s = get();
    const audio = s._audioEl;
    if (audio) audio.volume = clamped;
    if (s._ytPlayer?.setVolume) s._ytPlayer.setVolume(clamped * 100);
    localStorage.setItem('qaisify_volume', String(clamped));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => {
    const s = get();
    const newMuted = !s.isMuted;
    if (s._audioEl) s._audioEl.muted = newMuted;
    if (s._ytPlayer) {
      if (newMuted) s._ytPlayer.mute?.(); else s._ytPlayer.unMute?.();
    }
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
      const state = get();
      if (state.playbackSource === 'youtube' && state._ytPlayer?.getCurrentTime) {
        set({
          currentTime: state._ytPlayer.getCurrentTime() || 0,
          duration: state._ytPlayer.getDuration() || state.duration,
        });
      } else {
        const audio = state._audioEl;
        if (audio) {
          set({
            currentTime: audio.currentTime,
            duration: audio.duration || state.duration,
          });
        }
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
