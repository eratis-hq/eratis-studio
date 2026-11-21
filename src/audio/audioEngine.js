import { AUDIO_BANDS } from '../core/config.js';

export function computeBandBinRange(minHz, maxHz, sampleRate = 44100, fftSize = AUDIO_BANDS.FFT_SIZE) {
  const safeRate = Math.max(8000, Number(sampleRate) || 44100);
  const safeFft = Math.max(32, Number(fftSize) || 2048);
  const binCount = Math.floor(safeFft / 2);
  const hzPerBin = safeRate / safeFft;

  const startBin = Math.max(0, Math.min(binCount - 1, Math.round(minHz / hzPerBin)));
  const endBin = Math.max(startBin, Math.min(binCount - 1, Math.round(maxHz / hzPerBin)));
  return { startBin, endBin, hzPerBin };
}

export function computeNormalizedBandEnergy(frequencyData, startBin, endBin) {
  if (!frequencyData || frequencyData.length === 0) return 0;
  const lo = Math.max(0, Math.min(frequencyData.length - 1, startBin));
  const hi = Math.max(lo, Math.min(frequencyData.length - 1, endBin));

  let sum = 0;
  let count = 0;
  for (let i = lo; i <= hi; i++) {
    sum += frequencyData[i];
    count++;
  }
  if (count === 0) return 0;
  return Math.max(0, Math.min(1, sum / (count * 255)));
}

export function decayEnergyValue(current, dt, decayRate = 5.5) {
  const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));
  const next = current * Math.exp(-decayRate * safeDt);
  return next < 0.001 ? 0 : next;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export class AudioEngine {
  constructor(store) {
    this.store = store;
    this.audioEl = typeof document !== 'undefined' ? document.createElement('audio') : null;
    if (this.audioEl) {
      this.audioEl.preload = 'metadata';
      this.audioEl.crossOrigin = 'anonymous';
    }

    this.audioContext = null;
    this.sourceNode = null;
    this.analyser = null;
    this.gainNode = null;
    this.recordDestination = null;
    this.freqData = null;

    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;

    this.levels = { bass: 0, mid: 0, treble: 0 };
    this._listeners = new Set();
    this._trackCounter = 0;
    this._cleanups = [];

    if (this.audioEl) {
      this._bindAudioElementEvents();
    }

    if (this.store) {
      this._syncAudioSettings(this.store.getState().audio);
      const unsub = this.store.subscribe((state, section) => {
        if (section === 'all' || section === 'audio') {
          this._syncAudioSettings(state.audio);
        }
      });
      this._cleanups.push(unsub);
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit(type, payload = {}) {
    for (const listener of this._listeners) {
      listener(type, payload);
    }
  }

  _bindAudioElementEvents() {
    const onPlay = () => {
      this.isPlaying = true;
      this._emit('playstate', { isPlaying: true });
    };
    const onPause = () => {
      this.isPlaying = false;
      this._emit('playstate', { isPlaying: false });
    };
    const onTimeUpdate = () => {
      this._emit('timeupdate', {
        currentTime: this.audioEl.currentTime || 0,
        duration: Number.isFinite(this.audioEl.duration) ? this.audioEl.duration : 0
      });
    };
    const onLoadedMetadata = () => {
      const current = this.getCurrentTrack();
      if (current && Number.isFinite(this.audioEl.duration)) {
        current.duration = this.audioEl.duration;
        this._emit('playlistchange', { playlist: this.playlist, currentIndex: this.currentIndex });
      }
      onTimeUpdate();
    };
    const onEnded = () => {
      this._handleTrackEnded();
    };

    this.audioEl.addEventListener('play', onPlay);
    this.audioEl.addEventListener('pause', onPause);
    this.audioEl.addEventListener('timeupdate', onTimeUpdate);
    this.audioEl.addEventListener('loadedmetadata', onLoadedMetadata);
    this.audioEl.addEventListener('ended', onEnded);

    this._cleanups.push(() => {
      this.audioEl.removeEventListener('play', onPlay);
      this.audioEl.removeEventListener('pause', onPause);
      this.audioEl.removeEventListener('timeupdate', onTimeUpdate);
      this.audioEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      this.audioEl.removeEventListener('ended', onEnded);
    });
  }

  _syncAudioSettings(audioCfg) {
    if (!audioCfg) return;
    const effectiveVolume = audioCfg.muted ? 0 : Math.max(0, Math.min(1, audioCfg.volume));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setTargetAtTime(effectiveVolume, this.audioContext.currentTime, 0.02);
    } else if (this.audioEl) {
      this.audioEl.volume = effectiveVolume;
    }
  }

  _ensureGraph() {
    if (!this.audioEl) return false;
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      this.audioContext = new AudioCtx();
      this.sourceNode = this.audioContext.createMediaElementSource(this.audioEl);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = AUDIO_BANDS.FFT_SIZE;
      this.analyser.smoothingTimeConstant = AUDIO_BANDS.SMOOTHING;

      this.gainNode = this.audioContext.createGain();
      const audioCfg = this.store ? this.store.getState().audio : { volume: 0.85, muted: false };
      this.gainNode.gain.value = audioCfg.muted ? 0 : audioCfg.volume;

      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      if (typeof this.audioContext.createMediaStreamDestination === 'function') {
        this.recordDestination = this.audioContext.createMediaStreamDestination();
        this.gainNode.connect(this.recordDestination);
      }

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return true;
  }

  getRecordingAudioStream() {
    return this.recordDestination ? this.recordDestination.stream : null;
  }

  getPlaylist() {
    return this.playlist;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentTrack() {
    if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) return null;
    return this.playlist[this.currentIndex];
  }

  getPlaybackSnapshot() {
    return {
      isPlaying: this.isPlaying,
      currentIndex: this.currentIndex,
      track: this.getCurrentTrack(),
      currentTime: this.audioEl ? this.audioEl.currentTime || 0 : 0,
      duration: this.audioEl && Number.isFinite(this.audioEl.duration) ? this.audioEl.duration : 0,
      levels: { ...this.levels }
    };
  }

  static isAudioFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('audio/')) return true;
    return /\.(mp3|wav|ogg|flac|m4a|aac|webm|opus)$/i.test(file.name || '');
  }

  addFiles(fileList, { autoPlayFirst = true } = {}) {
    const files = Array.from(fileList || []).filter((f) => AudioEngine.isAudioFile(f));
    if (files.length === 0) return [];

    const wasEmpty = this.playlist.length === 0;
    const added = [];

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const track = {
        id: `track-${++this._trackCounter}-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        url,
        size: file.size || 0,
        duration: 0
      };
      this.playlist.push(track);
      added.push(track);
    }

    this._emit('playlistchange', { playlist: this.playlist, currentIndex: this.currentIndex });

    if (wasEmpty && autoPlayFirst) {
      this.selectTrack(0, true);
    }
    return added;
  }

  removeTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    const [removed] = this.playlist.splice(index, 1);
    if (removed && removed.url) {
      URL.revokeObjectURL(removed.url);
    }

    if (this.playlist.length === 0) {
      this.currentIndex = -1;
      if (this.audioEl) {
        this.audioEl.pause();
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      }
      this.isPlaying = false;
      this._emit('playstate', { isPlaying: false });
      this._emit('trackchange', { track: null, currentIndex: -1 });
      this._emit('playlistchange', { playlist: this.playlist, currentIndex: -1 });
      return;
    }

    if (index === this.currentIndex) {
      const nextIdx = Math.min(index, this.playlist.length - 1);
      this.selectTrack(nextIdx, this.isPlaying);
    } else if (index < this.currentIndex) {
      this.currentIndex -= 1;
    }
    this._emit('playlistchange', { playlist: this.playlist, currentIndex: this.currentIndex });
  }

  clearPlaylist() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.removeAttribute('src');
      this.audioEl.load();
    }
    for (const track of this.playlist) {
      if (track.url) URL.revokeObjectURL(track.url);
    }
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this._emit('playstate', { isPlaying: false });
    this._emit('trackchange', { track: null, currentIndex: -1 });
    this._emit('playlistchange', { playlist: this.playlist, currentIndex: -1 });
  }

  async selectTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.playlist.length || !this.audioEl) return false;
    this.currentIndex = index;
    const track = this.playlist[index];

    this.audioEl.src = track.url;
    this.audioEl.currentTime = 0;
    this._emit('trackchange', { track, currentIndex: this.currentIndex });
    this._emit('playlistchange', { playlist: this.playlist, currentIndex: this.currentIndex });

    if (autoPlay) {
      return this.play();
    }
    return true;
  }

  async play() {
    if (!this.audioEl || this.playlist.length === 0) return false;
    if (this.currentIndex < 0) {
      return this.selectTrack(0, true);
    }
    this._ensureGraph();
    try {
      await this.audioEl.play();
      return true;
    } catch (_) {
      this.isPlaying = false;
      this._emit('playstate', { isPlaying: false });
      return false;
    }
  }

  pause() {
    if (!this.audioEl) return;
    this.audioEl.pause();
  }

  async togglePlay() {
    if (this.playlist.length === 0) return false;
    if (this.isPlaying) {
      this.pause();
      return false;
    }
    return this.play();
  }

  seekTo(seconds) {
    if (!this.audioEl || !Number.isFinite(this.audioEl.duration)) return;
    const clamped = Math.max(0, Math.min(this.audioEl.duration, Number(seconds) || 0));
    this.audioEl.currentTime = clamped;
    this._emit('timeupdate', {
      currentTime: clamped,
      duration: this.audioEl.duration
    });
  }

  seekByProgress(ratio) {
    if (!this.audioEl || !Number.isFinite(this.audioEl.duration)) return;
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    this.seekTo(clamped * this.audioEl.duration);
  }

  nextTrack(manual = true) {
    if (this.playlist.length === 0) return;
    const audioCfg = this.store ? this.store.getState().audio : { shuffle: false, repeat: 'off' };

    if (audioCfg.shuffle && this.playlist.length > 1) {
      let nextIdx = this.currentIndex;
      while (nextIdx === this.currentIndex) {
        nextIdx = Math.floor(Math.random() * this.playlist.length);
      }
      this.selectTrack(nextIdx, true);
      return;
    }

    const nextIdx = this.currentIndex + 1;
    if (nextIdx < this.playlist.length) {
      this.selectTrack(nextIdx, true);
    } else if (manual || audioCfg.repeat === 'all') {
      this.selectTrack(0, true);
    } else {
      this.pause();
      this.seekTo(0);
    }
  }

  prevTrack() {
    if (this.playlist.length === 0) return;
    if (this.audioEl && this.audioEl.currentTime > 3.0) {
      this.seekTo(0);
      return;
    }
    const prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.selectTrack(prevIdx, true);
  }

  _handleTrackEnded() {
    const audioCfg = this.store ? this.store.getState().audio : { repeat: 'off' };
    if (audioCfg.repeat === 'one') {
      this.seekTo(0);
      this.play();
      return;
    }
    this.nextTrack(false);
  }

  sample(dt = 0.016) {
    if (!this.isPlaying || !this.analyser || !this.freqData || !this.audioContext) {
      this.levels.bass = decayEnergyValue(this.levels.bass, dt, 5.2);
      this.levels.mid = decayEnergyValue(this.levels.mid, dt, 5.2);
      this.levels.treble = decayEnergyValue(this.levels.treble, dt, 5.2);
      return this.levels;
    }

    this.analyser.getByteFrequencyData(this.freqData);
    const sr = this.audioContext.sampleRate || 44100;
    const fftSize = this.analyser.fftSize || AUDIO_BANDS.FFT_SIZE;

    const bassRange = computeBandBinRange(AUDIO_BANDS.BASS.minHz, AUDIO_BANDS.BASS.maxHz, sr, fftSize);
    const midRange = computeBandBinRange(AUDIO_BANDS.MID.minHz, AUDIO_BANDS.MID.maxHz, sr, fftSize);
    const trebleRange = computeBandBinRange(AUDIO_BANDS.TREBLE.minHz, AUDIO_BANDS.TREBLE.maxHz, sr, fftSize);

    const rawBass = computeNormalizedBandEnergy(this.freqData, bassRange.startBin, bassRange.endBin);
    const rawMid = computeNormalizedBandEnergy(this.freqData, midRange.startBin, midRange.endBin);
    const rawTreble = computeNormalizedBandEnergy(this.freqData, trebleRange.startBin, trebleRange.endBin);

    const smooth = 1 - Math.exp(-14 * Math.min(0.05, dt));
    this.levels.bass += (Math.pow(rawBass, 1.15) - this.levels.bass) * smooth;
    this.levels.mid += (Math.pow(rawMid, 1.05) - this.levels.mid) * smooth;
    this.levels.treble += (Math.pow(rawTreble, 1.0) - this.levels.treble) * smooth;

    return this.levels;
  }

  dispose() {
    this.clearPlaylist();
    for (const cleanup of this._cleanups) {
      try {
        cleanup();
      } catch (_) {

      }
    }
    this._cleanups = [];
    this._listeners.clear();

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (_) {}
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_) {}
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.analyser = null;
    this.gainNode = null;
    this.recordDestination = null;
    this.freqData = null;
  }
}
