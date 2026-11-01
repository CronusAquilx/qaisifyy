import { create } from 'zustand';
import type { ITunesTrack } from '@/lib/itunes';
import { searchYouTubeCandidates } from '@/lib/youtube';

type RepeatMode = 'off' | 'all' | 'one';
type PlaybackSource = 'youtube' | 'none';

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
  isNetworkBlocked: boolean;

  _audioEl: HTMLAudioElement | null;
  _ytPlayer: any | null;
  _intervalId: number | null;
  _ytCandidates: string[];
  _ytCandidateIndex: number;

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
  _fallbackFromYouTube: (errorCode?: number) => Promise<void>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  isNetworkBlocked: false,
  _audioEl: null,
  _ytPlayer: null,
  _intervalId: null,
  _ytCandidates: [],
  _ytCandidateIndex: -1,

  init: () => {
    if (get()._audioEl) return;
    const audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('ended', () => {
      if (get().playbackSource !== 'youtube') {
        get()._handleTrackEnd();
      }
    });
    audio.volume = get().volume;
    set({ _audioEl: audio });
  },

  _setYTPlayer: (player) => set({ _ytPlayer: player }),

  playTrack: async (track, queue, index) => {
    const s = get();
    s._stopPolling();

    const audio = s._audioEl;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    const yt = s._ytPlayer;
    if (yt?.stopVideo) {
      try {
        yt.stopVideo();
      } catch {}
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
      _ytCandidates: [],
      _ytCandidateIndex: -1,
    });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        artwork: [{ src: track.artworkUrl100?.replace(/\d+x\d+bb/, '512x512bb') || '', sizes: '512x512', type: 'image/jpeg' }],
      });
    }

    const ytCandidates = await searchYouTubeCandidates(track.trackName, track.artistName);
    if (ytCandidates.length === 0) {
      console.error('[Qaisify] No embeddable YouTube video candidates found');
      set({ isPlaying: false, isLoadingAudio: false, playbackSource: 'none' });
      return;
    }

    // Filtered networks (school proxies, Securly, etc.) can hold the YouTube
    // request for ~30s before letting it through — wait that long before failing.
    let ytPlayer = get()._ytPlayer;
    if (!ytPlayer?.loadVideoById) {
      for (let i = 0; i < 300; i++) {
        await wait(100);
        ytPlayer = get()._ytPlayer;
        if (ytPlayer?.loadVideoById) break;
        // a newer track took over while we were waiting
        if (get().currentTrack?.trackId !== track.trackId) return;
      }
    }

    if (!ytPlayer?.loadVideoById) {
      console.error('[Qaisify] YouTube player not ready (likely blocked by network filter)');
      set({ isPlaying: false, isLoadingAudio: false, playbackSource: 'none', isNetworkBlocked: true });
      return;
    }

    set({ isNetworkBlocked: false });

    const firstVideoId = ytCandidates[0];
    console.log(`[Qaisify] ▶ Playing via YouTube: ${firstVideoId}`);

    try {
      ytPlayer.loadVideoById(firstVideoId);
      ytPlayer.setVolume(get().volume * 100);
      if (get().isMuted) ytPlayer.mute?.();
      else ytPlayer.unMute?.();
      ytPlayer.playVideo?.();

      set({
        playbackSource: 'youtube',
        isPlaying: true,
        isLoadingAudio: false,
        _ytCandidates: ytCandidates,
        _ytCandidateIndex: 0,
      });

      get()._startPolling();

      const q = get().queue;
      const qi = get().queueIndex;
      if (qi < q.length - 1) {
        searchYouTubeCandidates(q[qi + 1].trackName, q[qi + 1].artistName).catch(() => {});
      }
    } catch (err) {
      console.error('[Qaisify] YouTube playback failed on first candidate', err);
      await get()._fallbackFromYouTube();
    }
  },

  _fallbackFromYouTube: async (errorCode) => {
    const s = get();
    if (!s.currentTrack || s.playbackSource !== 'youtube') return;

    const nextIndex = s._ytCandidateIndex + 1;
    const nextVideoId = s._ytCandidates[nextIndex];

    if (nextVideoId && s._ytPlayer?.loadVideoById) {
      console.warn(
        `[Qaisify] YouTube error${typeof errorCode === 'number' ? ` (${errorCode})` : ''}, trying next candidate: ${nextVideoId}`
      );

      set({ _ytCandidateIndex: nextIndex, isLoadingAudio: true });
      try {
        s._ytPlayer.loadVideoById(nextVideoId);
        s._ytPlayer.setVolume(get().volume * 100);
        if (get().isMuted) s._ytPlayer.mute?.();
        else s._ytPlayer.unMute?.();
        s._ytPlayer.playVideo?.();
        set({ isPlaying: true, isLoadingAudio: false });
        get()._startPolling();
        return;
      } catch (err) {
        console.error('[Qaisify] Next YouTube candidate failed', err);
        await get()._fallbackFromYouTube(errorCode);
        return;
      }
    }

    console.error(
      `[Qaisify] YouTube failed${typeof errorCode === 'number' ? ` (error ${errorCode})` : ''} and no more playable candidates`);
    set({
      isLoadingAudio: false,
      isPlaying: false,
      playbackSource: 'none',
    });
    get()._stopPolling();
  },

  togglePlay: () => {
    const s = get();
    if (!s.currentTrack) return;
    if (s.playbackSource !== 'youtube' || !s._ytPlayer) return;

    if (s.isPlaying) {
      s._ytPlayer.pauseVideo?.();
      set({ isPlaying: false });
      s._stopPolling();
    } else {
      s._ytPlayer.playVideo?.();
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
    if (s._ytPlayer?.seekTo) {
      s._ytPlayer.seekTo(time, true);
      set({ currentTime: time });
    }
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
      if (newMuted) s._ytPlayer.mute?.();
      else s._ytPlayer.unMute?.();
    }
    set({ isMuted: newMuted });
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),

  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  removeFromQueue: (index) =>
    set((s) => ({
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
