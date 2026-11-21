import { formatTime } from '../audio/audioEngine.js';

export class ExportStudio {
  constructor({ sceneEngine, presetManager, audioEngine, onNotify }) {
    this.sceneEngine = sceneEngine;
    this.presetManager = presetManager;
    this.audioEngine = audioEngine;
    this.onNotify = onNotify || (() => {});

    this.isOpen = false;
    this.isRecording = false;
    this.cinemaGrade = true;
    this.includeWatermark = false;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingStream = null;
    this.recordingStartedAt = 0;
    this.recordingTimer = null;

    this.el = null;
    this._buildModal();
  }

  static getVideoSupport() {
    const hasRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder === 'function';
    const testCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const hasCapture = Boolean(testCanvas && typeof testCanvas.captureStream === 'function');

    if (!hasRecorder || !hasCapture) {
      return {
        supported: false,
        mimeType: '',
        reason: 'This browser does not support MediaRecorder or canvas.captureStream() for WebM video export.'
      };
    }

    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const mime of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) {
        return { supported: true, mimeType: mime, reason: '' };
      }
    }

    return {
      supported: false,
      mimeType: '',
      reason: 'No supported WebM video codec was reported by MediaRecorder in this browser.'
    };
  }

  _buildModal() {
    const videoSupport = ExportStudio.getVideoSupport();

    const backdrop = document.createElement('div');
    backdrop.id = 'export-modal';
    backdrop.className = 'modal-backdrop hidden';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Wallpaper & Export Studio');

    backdrop.innerHTML = `
      <div class="export-card">
        <div class="export-header">
          <div>
            <div class="export-eyebrow">ERATIS WALLPAPER &amp; EXPORT STUDIO</div>
            <h2 class="export-title">Cinema Wallpapers &amp; 3D Captures</h2>
          </div>
          <button type="button" class="icon-close-btn" data-export-close title="Close (Esc)">✕</button>
        </div>

        <div class="export-finishing-bar">
          <label class="export-check">
            <input type="checkbox" id="export-chk-bloom" checked />
            <span>Cinema Specular Bloom &amp; Vignette</span>
          </label>
          <label class="export-check">
            <input type="checkbox" id="export-chk-watermark" />
            <span>Corner ERATIS Signature Tag</span>
          </label>
        </div>

        <div class="export-grid">
          <button type="button" class="export-tile" data-action="wallpaper-4k">
            <div class="export-tile-badge">4K UHD · 16:9</div>
            <div class="export-tile-name">4K Cinema Wallpaper</div>
            <div class="export-tile-desc">3840 × 2160 ultra-crisp desktop master with bloom</div>
          </button>

          <button type="button" class="export-tile" data-action="wallpaper-16-9">
            <div class="export-tile-badge">FULL HD · 16:9</div>
            <div class="export-tile-name">16:9 Desktop Wallpaper</div>
            <div class="export-tile-desc">1920 × 1080 widescreen obsidian space composition</div>
          </button>

          <button type="button" class="export-tile" data-action="wallpaper-21-9">
            <div class="export-tile-badge">ULTRAWIDE · 21:9</div>
            <div class="export-tile-name">21:9 Ultrawide Cinema</div>
            <div class="export-tile-desc">3440 × 1440 panoramic curved display wallpaper</div>
          </button>

          <button type="button" class="export-tile" data-action="wallpaper-9-16">
            <div class="export-tile-badge">MOBILE · 9:16</div>
            <div class="export-tile-name">9:16 Phone Lockscreen</div>
            <div class="export-tile-desc">1080 × 1920 vertical mobile wallpaper &amp; story</div>
          </button>

          <button type="button" class="export-tile" data-action="profile-1-1">
            <div class="export-tile-badge">2K SQUARE · 1:1</div>
            <div class="export-tile-name">1:1 Profile / Cover Art</div>
            <div class="export-tile-desc">2048 × 2048 centered high-res avatar &amp; album cover</div>
          </button>

          <button type="button" class="export-tile" data-action="png-transparent">
            <div class="export-tile-badge">ALPHA PNG</div>
            <div class="export-tile-name">Transparent 3D Logo</div>
            <div class="export-tile-desc">2560 × 1440 isolated 3D emblem with pure alpha channel</div>
          </button>
        </div>

        <div class="export-video-box">
          <div class="export-video-head">
            <div>
              <div class="export-tile-name">WebM Video Recorder (60 FPS) &amp; Scene JSON</div>
              <div class="export-tile-desc" id="export-video-status">
                ${videoSupport.supported
                  ? `Ready · Codec: ${videoSupport.mimeType}`
                  : videoSupport.reason}
              </div>
            </div>
            <div class="export-bottom-btns">
              <button type="button" class="studio-btn" data-action="scene-json" title="Download Validated Scene JSON">
                SCENE JSON
              </button>
              <button
                type="button"
                id="btn-record-webm"
                class="studio-btn primary"
                ${videoSupport.supported ? '' : 'disabled'}
              >
                <span class="rec-dot"></span>
                <span id="btn-record-label">START REC</span>
              </button>
            </div>
          </div>
          ${!videoSupport.supported
            ? `<div class="export-warning">⚠ ${videoSupport.reason}</div>`
            : `<div class="export-hint">Records live WebGL canvas at 60 FPS. Active Web Audio playback is muxed automatically.</div>`}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.el = backdrop;

    const chkBloom = backdrop.querySelector('#export-chk-bloom');
    const chkWater = backdrop.querySelector('#export-chk-watermark');
    if (chkBloom) {
      chkBloom.addEventListener('change', (e) => {
        this.cinemaGrade = e.target.checked;
      });
    }
    if (chkWater) {
      chkWater.addEventListener('change', (e) => {
        this.includeWatermark = e.target.checked;
      });
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-export-close]')) {
        this.close();
        return;
      }
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        this._handleAction(actionBtn.getAttribute('data-action'));
      }
    });

    const recBtn = backdrop.querySelector('#btn-record-webm');
    if (recBtn) {
      recBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      });
    }
  }

  open() {
    if (!this.el) return;
    this.isOpen = true;
    this.el.classList.remove('hidden');
  }

  close() {
    if (!this.el) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  triggerExportAction(action) {
    this._handleAction(action);
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  _downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  _handleAction(action) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    try {
      if (action === 'png-transparent') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 2560,
          height: 1440,
          transparent: true,
          hideStars: true,
          cinemaGrade: false
        });
        this._downloadDataUrl(dataUrl, `eratis-transparent-${stamp}.png`);
        this.onNotify('Exported Transparent 3D Logo (2560×1440 Alpha PNG).', 'success');
      } else if (action === 'wallpaper-4k') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 3840,
          height: 2160,
          transparent: false,
          hideStars: false,
          cinemaGrade: this.cinemaGrade,
          watermark: this.includeWatermark
        });
        this._downloadDataUrl(dataUrl, `eratis-wallpaper-4k-${stamp}.png`);
        this.onNotify('Exported 4K UHD Cinema Wallpaper (3840×2160).', 'success');
      } else if (action === 'wallpaper-16-9') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 1920,
          height: 1080,
          transparent: false,
          hideStars: false,
          cinemaGrade: this.cinemaGrade,
          watermark: this.includeWatermark
        });
        this._downloadDataUrl(dataUrl, `eratis-wallpaper-16x9-${stamp}.png`);
        this.onNotify('Exported 16:9 HD Wallpaper (1920×1080).', 'success');
      } else if (action === 'wallpaper-21-9') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 3440,
          height: 1440,
          transparent: false,
          hideStars: false,
          cinemaGrade: this.cinemaGrade,
          watermark: this.includeWatermark
        });
        this._downloadDataUrl(dataUrl, `eratis-ultrawide-21x9-${stamp}.png`);
        this.onNotify('Exported 21:9 Ultrawide Wallpaper (3440×1440).', 'success');
      } else if (action === 'wallpaper-9-16') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 1080,
          height: 1920,
          transparent: false,
          hideStars: false,
          cinemaGrade: this.cinemaGrade,
          watermark: this.includeWatermark
        });
        this._downloadDataUrl(dataUrl, `eratis-mobile-9x16-${stamp}.png`);
        this.onNotify('Exported 9:16 Mobile Lockscreen Wallpaper (1080×1920).', 'success');
      } else if (action === 'profile-1-1') {
        const dataUrl = this.sceneEngine.captureSnapshot({
          width: 2048,
          height: 2048,
          transparent: false,
          hideStars: false,
          cinemaGrade: this.cinemaGrade,
          watermark: this.includeWatermark
        });
        this._downloadDataUrl(dataUrl, `eratis-profile-1x1-${stamp}.png`);
        this.onNotify('Exported 1:1 Square Profile Art (2048×2048).', 'success');
      } else if (action === 'scene-json') {
        const { json, payload } = this.presetManager.exportSceneJSON(`ERATIS Scene ${stamp}`);
        const blob = new Blob([json], { type: 'application/json' });
        this._downloadBlob(blob, `eratis-scene-${stamp}.json`);
        this.onNotify(
          payload.metadata.excludedTypes.length > 0
            ? 'Scene JSON exported (local media omitted for privacy).'
            : 'Scene JSON exported successfully.',
          'success'
        );
      }
    } catch (err) {
      this.onNotify(`Export failed: ${err.message}`, 'error');
    }
  }

  startRecording() {
    const support = ExportStudio.getVideoSupport();
    if (!support.supported) {
      this.onNotify(support.reason, 'warning');
      return;
    }

    const canvas = this.sceneEngine.getCanvas();
    if (!canvas) {
      this.onNotify('WebGL canvas is unavailable for recording.', 'error');
      return;
    }

    try {
      const canvasStream = canvas.captureStream(60);
      const tracks = [...canvasStream.getVideoTracks()];

      const audioStream = this.audioEngine ? this.audioEngine.getRecordingAudioStream() : null;
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          tracks.push(audioTracks[0]);
        }
      }

      this.recordingStream = new MediaStream(tracks);
      this.recordedChunks = [];

      const options = {
        mimeType: support.mimeType,
        videoBitsPerSecond: 8000000
      };

      this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          this.recordedChunks.push(ev.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: support.mimeType || 'video/webm' });
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this._downloadBlob(blob, `eratis-capture-${stamp}.webm`);
        this.recordedChunks = [];
        this._cleanupRecordingStream();
        this.onNotify('WebM video recording saved.', 'success');
      };

      this.mediaRecorder.onerror = () => {
        this.onNotify('Video recording encountered a MediaRecorder error.', 'error');
        this.stopRecording();
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.recordingStartedAt = Date.now();
      this._updateRecordingUI();

      this.recordingTimer = setInterval(() => this._updateRecordingUI(), 250);
      this.onNotify('WebM recording started. Close modal to interact while recording.', 'info');
    } catch (err) {
      this._cleanupRecordingStream();
      this.onNotify(`Unable to start WebM recording: ${err.message}`, 'error');
    }
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (_) {
        this._cleanupRecordingStream();
      }
    } else {
      this._cleanupRecordingStream();
    }
    this._updateRecordingUI();
  }

  _cleanupRecordingStream() {
    if (this.recordingStream) {
      for (const track of this.recordingStream.getVideoTracks()) {
        track.stop();
      }
      this.recordingStream = null;
    }
    this.mediaRecorder = null;
  }

  _updateRecordingUI() {
    if (!this.el) return;
    const btn = this.el.querySelector('#btn-record-webm');
    const lbl = this.el.querySelector('#btn-record-label');
    const status = this.el.querySelector('#export-video-status');
    const dockRecIndicator = document.getElementById('dock-rec-badge');

    if (this.isRecording) {
      const elapsed = (Date.now() - this.recordingStartedAt) / 1000;
      if (btn) btn.classList.add('recording');
      if (lbl) lbl.textContent = `STOP (${formatTime(elapsed)})`;
      if (status) status.textContent = `Recording live WebM · ${formatTime(elapsed)}`;
      if (dockRecIndicator) dockRecIndicator.classList.remove('hidden');
    } else {
      const support = ExportStudio.getVideoSupport();
      if (btn) btn.classList.remove('recording');
      if (lbl) lbl.textContent = 'START REC';
      if (status) {
        status.textContent = support.supported ? `Ready · Codec: ${support.mimeType}` : support.reason;
      }
      if (dockRecIndicator) dockRecIndicator.classList.add('hidden');
    }
  }

  dispose() {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}
