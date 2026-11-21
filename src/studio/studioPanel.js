import {
  FONT_OPTIONS,
  MATERIAL_CATALOG,
  REPEAT_MODES
} from '../core/config.js';
import { formatTime } from '../audio/audioEngine.js';

export class StudioPanel {
  constructor({
    store,
    sceneEngine,
    audioEngine,
    presetManager,
    signatureIntro,
    onOpenExport,
    onNotify,
    onOpenChange
  }) {
    this.store = store;
    this.sceneEngine = sceneEngine;
    this.audioEngine = audioEngine;
    this.presetManager = presetManager;
    this.signatureIntro = signatureIntro;
    this.onOpenExport = onOpenExport || (() => {});
    this.onNotify = onNotify || (() => {});
    this.onOpenChange = onOpenChange || (() => {});

    this.isOpen = false;
    this.activeTab = 'identity';
    this.el = null;
    this._meterRaf = null;
    this._isScrubbing = false;
    this._cleanups = [];

    this._build();
    this._bindEvents();
    this.syncAll();
  }

  _build() {
    const panel = document.createElement('aside');
    panel.id = 'studio-panel';
    panel.className = 'studio-panel hidden';
    panel.setAttribute('aria-label', 'ERATIS Studio Control Panel');

    const materialButtonsHtml = Object.values(MATERIAL_CATALOG)
      .map(
        (m) => `
        <button type="button" class="material-chip" data-material-id="${m.id}">
          <span class="material-swatch" style="background: ${m.swatch}"></span>
          <span class="material-name">${m.label}</span>
        </button>`
      )
      .join('');

    const fontOptionsHtml = FONT_OPTIONS.map(
      (f) => `<option value="${f.id}">${f.label}</option>`
    ).join('');

    panel.innerHTML = `

      <div class="studio-header">
        <div class="studio-title-row">
          <div class="studio-brand-title">
            <span class="brand-dot"></span>
            <span>ERATIS STUDIO</span>
          </div>
          <div class="studio-header-actions">
            <button type="button" class="studio-mini-btn" id="studio-btn-reset-all" title="Reset All Settings to Default (R)">RESET ALL</button>
            <button type="button" class="studio-mini-btn" id="studio-btn-export" title="Open Export Studio">EXPORT</button>
            <button type="button" class="icon-close-btn" id="studio-btn-close" title="Close Studio (S / Esc)">✕</button>
          </div>
        </div>

        <div class="preset-bar">
          <select id="preset-select" class="studio-select" aria-label="Select Preset"></select>
          <button type="button" class="studio-mini-btn" id="btn-preset-save" title="Save Custom Preset">SAVE</button>
          <button type="button" class="studio-mini-btn" id="btn-preset-delete" title="Delete Custom Preset">DEL</button>
          <button type="button" class="studio-mini-btn" id="btn-preset-import" title="Import Preset JSON">IN</button>
          <button type="button" class="studio-mini-btn" id="btn-preset-export" title="Export Preset JSON">OUT</button>
        </div>

        <div id="preset-save-drawer" class="preset-save-drawer hidden">
          <input type="text" id="preset-name-input" class="studio-input" maxlength="50" placeholder="Custom preset name..." />
          <button type="button" class="studio-mini-btn primary" id="btn-preset-confirm-save">OK</button>
          <button type="button" class="studio-mini-btn" id="btn-preset-cancel-save">✕</button>
        </div>

        <nav class="studio-tabs" role="tablist">
          <button type="button" class="studio-tab active" data-tab="identity" role="tab">Identity</button>
          <button type="button" class="studio-tab" data-tab="environment" role="tab">Environment</button>
          <button type="button" class="studio-tab" data-tab="audio" role="tab">Audio</button>
          <button type="button" class="studio-tab" data-tab="camera" role="tab">Camera</button>
          <button type="button" class="studio-tab" data-tab="effects" role="tab">Effects</button>
        </nav>
      </div>

      <div class="studio-body">

        <section class="tab-pane active" data-pane="identity">
          <div class="control-group">
            <div class="group-header">
              <span>IDENTITY MODE</span>
              <button type="button" class="link-reset-btn" id="btn-return-eratis">Reset to ERATIS</button>
            </div>
            <div class="segmented-control">
              <button type="button" class="seg-btn active" data-mode="eratis">ERATIS 3D</button>
              <button type="button" class="seg-btn" data-mode="text">3D Text</button>
              <button type="button" class="seg-btn" data-mode="image">Image Layer</button>
            </div>
          </div>

          <div id="identity-text-section" class="control-group hidden">
            <div class="group-header">
              <span>3D EXTRUDED TYPOGRAPHY</span>
              <button type="button" class="link-reset-btn hidden" id="btn-restore-fonts">Restore 16 Fonts</button>
            </div>
            <div class="field-row">
              <label for="ctrl-text-value">Text Content</label>
              <input type="text" id="ctrl-text-value" class="studio-input" maxlength="36" placeholder="ERATIS" />
            </div>
            <div class="field-row">
              <label for="ctrl-text-font">Typeface</label>
              <div class="font-action-bar">
                <select id="ctrl-text-font" class="studio-select">${fontOptionsHtml}</select>
                <button type="button" class="studio-mini-btn primary" id="btn-upload-custom-font" title="Add Custom Font (.TTF / .OTF / .WOFF / .JSON)">+ ADD</button>
                <button type="button" class="studio-mini-btn" id="btn-delete-font" title="Delete Selected Font">DEL</button>
              </div>
            </div>
            <div id="custom-fonts-list" class="custom-fonts-list hidden"></div>
            <div id="text-font-status" class="media-file-status hidden" role="status" aria-live="polite"></div>
            <div class="slider-row">
              <div class="slider-label"><span>Letter Spacing</span><output id="out-text-spacing">0.14</output></div>
              <input type="range" id="ctrl-text-spacing" min="-0.1" max="0.8" step="0.01" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Italic Slant</span><output id="out-text-slant">0.24</output></div>
              <input type="range" id="ctrl-text-slant" min="-0.45" max="0.6" step="0.01" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Extrude Depth</span><output id="out-text-depth">0.56</output></div>
              <input type="range" id="ctrl-text-depth" min="0.08" max="1.6" step="0.02" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Bevel Size</span><output id="out-text-bevel-size">0.08</output></div>
              <input type="range" id="ctrl-text-bevel-size" min="0" max="0.24" step="0.005" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Bevel Thickness</span><output id="out-text-bevel-thick">0.12</output></div>
              <input type="range" id="ctrl-text-bevel-thick" min="0" max="0.3" step="0.005" />
            </div>
          </div>

          <div id="identity-image-section" class="control-group hidden">
            <div class="group-header"><span>FLAT MEDIA LAYER (ALPHA / ASPECT PRESERVED)</span></div>
            <div class="media-upload-box">
              <div class="media-file-status" id="image-file-status">No custom image loaded</div>
              <div class="btn-row">
                <button type="button" class="studio-btn primary" id="btn-upload-image">Upload PNG / JPG / WebP / SVG</button>
                <button type="button" class="studio-btn" id="btn-clear-image">Clear</button>
              </div>
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Layer Opacity</span><output id="out-img-opacity">1.00</output></div>
              <input type="range" id="ctrl-img-opacity" min="0.05" max="1" step="0.01" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Layer Scale</span><output id="out-img-scale">1.00</output></div>
              <input type="range" id="ctrl-img-scale" min="0.25" max="2.5" step="0.02" />
            </div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>SURFACE MATERIAL</span></div>
            <div class="material-grid">${materialButtonsHtml}</div>
          </div>

          <div class="control-group">
            <div class="group-header">
              <span>3D TRANSFORM &amp; ORBITS</span>
              <button type="button" class="link-reset-btn" id="btn-reset-transform">Reset</button>
            </div>
            <label class="toggle-row">
              <span>3D Tapered Orbital Rings</span>
              <input type="checkbox" id="ctrl-show-orbits" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Scale</span><output id="out-id-scale">1.00</output></div>
              <input type="range" id="ctrl-id-scale" min="0.35" max="2.0" step="0.01" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Position X</span><output id="out-id-posx">0.00</output></div>
              <input type="range" id="ctrl-id-posx" min="-6" max="6" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Position Y</span><output id="out-id-posy">0.00</output></div>
              <input type="range" id="ctrl-id-posy" min="-4" max="4" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Rotation X (°)</span><output id="out-id-rotx">0°</output></div>
              <input type="range" id="ctrl-id-rotx" min="-180" max="180" step="1" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Rotation Y (°)</span><output id="out-id-roty">0°</output></div>
              <input type="range" id="ctrl-id-roty" min="-180" max="180" step="1" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Rotation Z (°)</span><output id="out-id-rotz">0°</output></div>
              <input type="range" id="ctrl-id-rotz" min="-180" max="180" step="1" />
            </div>
          </div>
        </section>

        <section class="tab-pane" data-pane="environment">
          <div class="control-group">
            <div class="group-header"><span>STUDIO LIGHTING &amp; REFLECTIONS</span></div>
            <div class="field-row">
              <label for="ctrl-env-bg">Void Color</label>
              <div class="color-picker-wrap">
                <input type="color" id="ctrl-env-bg" value="#000000" />
                <button type="button" class="studio-mini-btn" id="btn-env-obsidian">Obsidian #000</button>
              </div>
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Tone Exposure</span><output id="out-env-exposure">1.42</output></div>
              <input type="range" id="ctrl-env-exposure" min="0.5" max="2.5" step="0.02" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Chrome Reflection</span><output id="out-env-reflection">1.00</output></div>
              <input type="range" id="ctrl-env-reflection" min="0.2" max="2.2" step="0.02" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Key Light</span><output id="out-env-key">2.70</output></div>
              <input type="range" id="ctrl-env-key" min="0" max="5.0" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Silver Rim Light</span><output id="out-env-rim">1.95</output></div>
              <input type="range" id="ctrl-env-rim" min="0" max="5.0" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Cursor Specular Light</span><output id="out-env-cursor">2.50</output></div>
              <input type="range" id="ctrl-env-cursor" min="0" max="5.0" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Deep Space Fog</span><output id="out-env-fog">0.008</output></div>
              <input type="range" id="ctrl-env-fog" min="0" max="0.03" step="0.0005" />
            </div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>DEEP SPACE STARFIELD</span></div>
            <label class="toggle-row">
              <span>Enable Starfield</span>
              <input type="checkbox" id="ctrl-env-stars-enabled" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Star Density</span><output id="out-env-star-count">2400</output></div>
              <input type="range" id="ctrl-env-star-count" min="200" max="4800" step="100" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Drift Speed</span><output id="out-env-star-speed">1.00</output></div>
              <input type="range" id="ctrl-env-star-speed" min="0.1" max="3.5" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Star Size</span><output id="out-env-star-size">0.25</output></div>
              <input type="range" id="ctrl-env-star-size" min="0.08" max="0.65" step="0.01" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Star Brightness</span><output id="out-env-star-bright">0.92</output></div>
              <input type="range" id="ctrl-env-star-bright" min="0.15" max="1.0" step="0.02" />
            </div>
          </div>
        </section>

        <section class="tab-pane" data-pane="audio">
          <div class="control-group">
            <div class="group-header">
              <span>WEB AUDIO API ENGINE (FFT 2048)</span>
              <button type="button" class="studio-mini-btn primary" id="btn-audio-add-files">+ ADD TRACKS</button>
            </div>

            <div class="spectrum-meters">
              <div class="meter-row">
                <span class="meter-label">BASS <small>20–150Hz</small></span>
                <div class="meter-track"><div class="meter-fill" id="meter-fill-bass"></div></div>
                <span class="meter-val" id="meter-val-bass">0%</span>
              </div>
              <div class="meter-row">
                <span class="meter-label">MID <small>150–2.5kHz</small></span>
                <div class="meter-track"><div class="meter-fill" id="meter-fill-mid"></div></div>
                <span class="meter-val" id="meter-val-mid">0%</span>
              </div>
              <div class="meter-row">
                <span class="meter-label">TREBLE <small>2.5–12kHz</small></span>
                <div class="meter-track"><div class="meter-fill" id="meter-fill-treble"></div></div>
                <span class="meter-val" id="meter-val-treble">0%</span>
              </div>
            </div>

            <div class="player-box">
              <div class="now-playing-title" id="audio-now-playing">No track loaded — drop or add audio files</div>
              <div class="scrub-row">
                <span id="audio-time-current">0:00</span>
                <input type="range" id="ctrl-audio-scrub" min="0" max="1000" value="0" step="1" />
                <span id="audio-time-total">0:00</span>
              </div>
              <div class="transport-row">
                <button type="button" class="studio-mini-btn" id="btn-audio-shuffle" title="Toggle Shuffle">SHUF</button>
                <button type="button" class="studio-mini-btn" id="btn-audio-prev" title="Previous Track (←)">⏮</button>
                <button type="button" class="studio-btn primary transport-play" id="btn-audio-play" title="Play / Pause (Space)">PLAY</button>
                <button type="button" class="studio-mini-btn" id="btn-audio-next" title="Next Track (→)">⏭</button>
                <button type="button" class="studio-mini-btn" id="btn-audio-repeat" title="Cycle Repeat Mode">REP: OFF</button>
              </div>
              <div class="slider-row">
                <div class="slider-label">
                  <span>Volume</span>
                  <button type="button" class="link-reset-btn" id="btn-audio-mute">Mute</button>
                </div>
                <input type="range" id="ctrl-audio-volume" min="0" max="1" step="0.01" />
              </div>
            </div>
          </div>

          <div class="control-group">
            <div class="group-header">
              <span>PLAYLIST (<span id="playlist-count">0</span>)</span>
              <button type="button" class="link-reset-btn" id="btn-audio-clear">Clear All</button>
            </div>
            <div id="audio-playlist" class="playlist-list"></div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>3D AUDIO REACTIVITY</span></div>
            <label class="toggle-row">
              <span>Enable Audio Reactivity</span>
              <input type="checkbox" id="ctrl-audio-reactive" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Bass → Chrome &amp; Orbit Scale</span><output id="out-audio-bass">1.00</output></div>
              <input type="range" id="ctrl-audio-bass" min="0" max="2.5" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Mid/Treble → Stars &amp; Lights</span><output id="out-audio-midtreble">1.00</output></div>
              <input type="range" id="ctrl-audio-midtreble" min="0" max="2.5" step="0.05" />
            </div>
          </div>
        </section>

        <section class="tab-pane" data-pane="camera">
          <div class="control-group">
            <div class="group-header">
              <span>CINEMATIC PERSPECTIVE</span>
              <button type="button" class="link-reset-btn" id="btn-camera-reset">Reset View</button>
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Camera Distance (Z)</span><output id="out-cam-dist">25.5</output></div>
              <input type="range" id="ctrl-cam-dist" min="11" max="42" step="0.1" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Field of View (FOV)</span><output id="out-cam-fov">38°</output></div>
              <input type="range" id="ctrl-cam-fov" min="22" max="70" step="1" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Cursor Parallax</span><output id="out-cam-parallax">1.00</output></div>
              <input type="range" id="ctrl-cam-parallax" min="0" max="2.2" step="0.05" />
            </div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>ORBIT, SWAY &amp; POSE LOCK</span></div>
            <label class="toggle-row">
              <span>Static Pose Lock — Freeze Sway &amp; Drift (L)</span>
              <input type="checkbox" id="ctrl-cam-lock" />
            </label>
            <label class="toggle-row">
              <span>360° Continuous Auto-Orbit (O)</span>
              <input type="checkbox" id="ctrl-cam-orbit" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Orbit Speed</span><output id="out-cam-orbit-speed">0.55</output></div>
              <input type="range" id="ctrl-cam-orbit-speed" min="0.05" max="2.2" step="0.05" />
            </div>
            <label class="toggle-row">
              <span>Cinematic Idle Floating Sway</span>
              <input type="checkbox" id="ctrl-cam-sway" />
            </label>
          </div>
        </section>

        <section class="tab-pane" data-pane="effects">
          <div class="control-group">
            <div class="group-header"><span>HYPERDRIVE &amp; LENS OPTICS</span></div>
            <label class="toggle-row">
              <span>Warp Hyperdrive (W)</span>
              <input type="checkbox" id="ctrl-fx-warp" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Warp Intensity</span><output id="out-fx-warp-int">1.00</output></div>
              <input type="range" id="ctrl-fx-warp-int" min="0.2" max="2.5" step="0.05" />
            </div>
            <label class="toggle-row">
              <span>4-Point Orbital Lens Flares</span>
              <input type="checkbox" id="ctrl-fx-flares" />
            </label>
            <div class="slider-row">
              <div class="slider-label"><span>Lens Flare Scale</span><output id="out-fx-flare-int">1.00</output></div>
              <input type="range" id="ctrl-fx-flare-int" min="0.1" max="2.4" step="0.05" />
            </div>
            <div class="slider-row">
              <div class="slider-label"><span>Obsidian Edge Vignette</span><output id="out-fx-vignette">0.72</output></div>
              <input type="range" id="ctrl-fx-vignette" min="0" max="1" step="0.02" />
            </div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>ERATIS SIGNATURE INTRO</span></div>
            <div class="media-file-status" id="signature-file-status">Default ERATIS Signature SVG</div>
            <div class="btn-row">
              <button type="button" class="studio-btn primary" id="btn-replay-intro">Replay Pen-Draw Intro</button>
            </div>
            <div class="btn-row" style="margin-top: 8px;">
              <button type="button" class="studio-btn" id="btn-upload-signature">Upload Custom .SVG</button>
              <button type="button" class="studio-btn" id="btn-reset-signature">Default SVG</button>
            </div>
          </div>

          <div class="control-group">
            <div class="group-header"><span>KEYBOARD SHORTCUTS</span></div>
            <div class="shortcut-list">
              <div class="shortcut-item"><span>Play / Pause Audio</span><kbd>Space</kbd></div>
              <div class="shortcut-item"><span>Toggle Studio Panel</span><kbd>S</kbd></div>
              <div class="shortcut-item"><span>Toggle 360° Orbit</span><kbd>O</kbd></div>
              <div class="shortcut-item"><span>Toggle Static Pose Lock</span><kbd>L</kbd></div>
              <div class="shortcut-item"><span>Toggle Warp Drive</span><kbd>W</kbd></div>
              <div class="shortcut-item"><span>Hide / Show UI (Zen)</span><kbd>H</kbd></div>
              <div class="shortcut-item"><span>Factory Reset All</span><kbd>R</kbd></div>
              <div class="shortcut-item"><span>Prev / Next Track</span><kbd>← / →</kbd></div>
              <div class="shortcut-item"><span>Skip Intro / Close</span><kbd>Esc</kbd></div>
            </div>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(panel);
    this.el = panel;
  }

  open() {
    if (!this.el) return;
    this.isOpen = true;
    this.el.classList.remove('hidden');
    this.onOpenChange(true);
    this._startMeterLoop();
  }

  close() {
    if (!this.el) return;
    this.isOpen = false;
    this.el.classList.add('hidden');
    this.onOpenChange(false);
    this._stopMeterLoop();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    const tabs = this.el.querySelectorAll('.studio-tab');
    tabs.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    const panes = this.el.querySelectorAll('.tab-pane');
    panes.forEach((pane) => {
      pane.classList.toggle('active', pane.getAttribute('data-pane') === tabId);
    });
  }

  _bindEvents() {
    const q = (sel) => this.el.querySelector(sel);

    q('#studio-btn-close').addEventListener('click', () => this.close());
    q('#studio-btn-export').addEventListener('click', () => this.onOpenExport());
    q('#studio-btn-reset-all').addEventListener('click', () => {
      this.store.resetAll();
      this.sceneEngine.resetViewOrientation();
      this.presetManager.persistActiveState();
      this.onNotify('All settings restored to factory ERATIS defaults.', 'success');
    });

    this.el.querySelectorAll('.studio-tab').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.getAttribute('data-tab')));
    });

    const presetSelect = q('#preset-select');
    const saveDrawer = q('#preset-save-drawer');
    const nameInput = q('#preset-name-input');

    presetSelect.addEventListener('change', () => {
      const preset = this.presetManager.applyPreset(presetSelect.value);
      if (preset) {
        this.onNotify(`Applied preset: ${preset.name}`, 'info');
      }
    });

    q('#btn-preset-save').addEventListener('click', () => {
      saveDrawer.classList.toggle('hidden');
      if (!saveDrawer.classList.contains('hidden')) {
        nameInput.value = '';
        nameInput.focus();
      }
    });

    q('#btn-preset-cancel-save').addEventListener('click', () => {
      saveDrawer.classList.add('hidden');
    });

    const confirmSavePreset = () => {
      try {
        const res = this.presetManager.saveCustomPreset(nameInput.value);
        saveDrawer.classList.add('hidden');
        this.onNotify(
          res.updated ? `Updated preset "${res.preset.name}".` : `Saved preset "${res.preset.name}".`,
          'success'
        );
      } catch (err) {
        this.onNotify(err.message, 'warning');
      }
    };

    q('#btn-preset-confirm-save').addEventListener('click', confirmSavePreset);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmSavePreset();
    });

    q('#btn-preset-delete').addEventListener('click', () => {
      const currentId = presetSelect.value;
      const preset = this.presetManager.getPresetById(currentId);
      if (!preset || preset.builtin) {
        this.onNotify('Built-in ERATIS presets cannot be deleted.', 'warning');
        return;
      }
      this.presetManager.deleteCustomPreset(currentId);
      this.onNotify(`Deleted custom preset "${preset.name}".`, 'info');
    });

    q('#btn-preset-import').addEventListener('click', () => {
      const input = document.getElementById('preset-json-input');
      if (input) input.click();
    });

    q('#btn-preset-export').addEventListener('click', () => {
      const preset = this.presetManager.getPresetById(presetSelect.value);
      const { json } = this.presetManager.exportSceneJSON(preset ? preset.name : 'ERATIS Custom');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eratis-preset.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      this.onNotify('Exported schema-validated preset JSON (local media excluded).', 'success');
    });

    this.el.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.store.updateSection('identity', { mode });
        this.presetManager.persistActiveState();
      });
    });

    q('#btn-return-eratis').addEventListener('click', () => {
      this.store.resetIdentityToEratis();
      this.presetManager.persistActiveState();
      this.onNotify('Restored default 3D ERATIS emblem.', 'info');
    });

    this.el.querySelectorAll('.material-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const material = chip.getAttribute('data-material-id');
        this.store.updateSection('identity', { material });
        this.presetManager.persistActiveState();
      });
    });

    const bindText = (sel, key, isNumeric = true) => {
      const el = q(sel);
      el.addEventListener('input', () => {
        const val = isNumeric ? Number(el.value) : el.value;
        this.store.updateSection('identity', { text: { [key]: val } });
        this.presetManager.persistActiveState();
      });
    };
    bindText('#ctrl-text-value', 'value', false);
    bindText('#ctrl-text-font', 'font', false);
    bindText('#ctrl-text-spacing', 'letterSpacing', true);
    bindText('#ctrl-text-slant', 'italicSlant', true);
    bindText('#ctrl-text-depth', 'depth', true);
    bindText('#ctrl-text-bevel-size', 'bevelSize', true);
    bindText('#ctrl-text-bevel-thick', 'bevelThickness', true);

    q('#btn-upload-custom-font').addEventListener('click', () => {
      const input = document.getElementById('custom-font-input');
      if (input) input.click();
    });

    q('#btn-delete-font').addEventListener('click', () => {
      const select = q('#ctrl-text-font');
      if (!select || !select.value) return;
      try {
        const res = this.sceneEngine.deleteFont(select.value);
        if (res) {
          this.refreshFontOptions();
          this.syncFromStore();
          this.onNotify(`Deleted font: ${res.removedLabel}`, 'info');
        }
      } catch (err) {
        this.onNotify(err.message, 'warning');
      }
    });

    q('#btn-restore-fonts').addEventListener('click', () => {
      this.sceneEngine.restoreDefaultFonts();
      this.refreshFontOptions();
      this.onNotify('Restored all 16 built-in 3D fonts.', 'success');
    });

    q('#btn-upload-image').addEventListener('click', () => {
      const input = document.getElementById('image-input');
      if (input) input.click();
    });
    q('#btn-clear-image').addEventListener('click', () => {
      this.sceneEngine.clearCustomImage();
      this.onNotify('Cleared custom image layer.', 'info');
    });
    q('#ctrl-img-opacity').addEventListener('input', (e) => {
      this.store.updateSection('identity', { image: { opacity: Number(e.target.value) } });
    });
    q('#ctrl-img-scale').addEventListener('input', (e) => {
      this.store.updateSection('identity', { image: { scale: Number(e.target.value) } });
    });

    q('#ctrl-show-orbits').addEventListener('change', (e) => {
      this.store.updateSection('identity', { showOrbits: e.target.checked });
      this.presetManager.persistActiveState();
    });

    const bindIdentityNum = (sel, key) => {
      const el = q(sel);
      el.addEventListener('input', () => {
        this.store.updateSection('identity', { [key]: Number(el.value) });
        this.presetManager.persistActiveState();
      });
    };
    bindIdentityNum('#ctrl-id-scale', 'scale');
    bindIdentityNum('#ctrl-id-posx', 'positionX');
    bindIdentityNum('#ctrl-id-posy', 'positionY');
    bindIdentityNum('#ctrl-id-rotx', 'rotationX');
    bindIdentityNum('#ctrl-id-roty', 'rotationY');
    bindIdentityNum('#ctrl-id-rotz', 'rotationZ');

    q('#btn-reset-transform').addEventListener('click', () => {
      this.store.updateSection('identity', {
        positionX: 0,
        positionY: 0,
        scale: 1.0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        showOrbits: true
      });
      this.presetManager.persistActiveState();
    });

    q('#ctrl-env-bg').addEventListener('input', (e) => {
      this.store.updateSection('environment', { backgroundColor: e.target.value });
      this.presetManager.persistActiveState();
    });
    q('#btn-env-obsidian').addEventListener('click', () => {
      this.store.updateSection('environment', { backgroundColor: '#000000' });
      this.presetManager.persistActiveState();
    });

    const bindEnvNum = (sel, key) => {
      const el = q(sel);
      el.addEventListener('input', () => {
        this.store.updateSection('environment', { [key]: Number(el.value) });
        this.presetManager.persistActiveState();
      });
    };
    bindEnvNum('#ctrl-env-exposure', 'exposure');
    bindEnvNum('#ctrl-env-reflection', 'reflectionIntensity');
    bindEnvNum('#ctrl-env-key', 'keyLightIntensity');
    bindEnvNum('#ctrl-env-rim', 'rimLightIntensity');
    bindEnvNum('#ctrl-env-cursor', 'cursorLightIntensity');
    bindEnvNum('#ctrl-env-fog', 'fogDensity');
    bindEnvNum('#ctrl-env-star-count', 'starCount');
    bindEnvNum('#ctrl-env-star-speed', 'starSpeed');
    bindEnvNum('#ctrl-env-star-size', 'starSize');
    bindEnvNum('#ctrl-env-star-bright', 'starBrightness');

    q('#ctrl-env-stars-enabled').addEventListener('change', (e) => {
      this.store.updateSection('environment', { starfieldEnabled: e.target.checked });
      this.presetManager.persistActiveState();
    });

    q('#btn-audio-add-files').addEventListener('click', () => {
      const input = document.getElementById('audio-input');
      if (input) input.click();
    });

    q('#btn-audio-play').addEventListener('click', () => {
      if (this.audioEngine.getPlaylist().length === 0) {
        const input = document.getElementById('audio-input');
        if (input) input.click();
      } else {
        this.audioEngine.togglePlay();
      }
    });

    q('#btn-audio-prev').addEventListener('click', () => this.audioEngine.prevTrack());
    q('#btn-audio-next').addEventListener('click', () => this.audioEngine.nextTrack(true));

    q('#btn-audio-shuffle').addEventListener('click', () => {
      const cur = this.store.getState().audio.shuffle;
      this.store.updateSection('audio', { shuffle: !cur });
    });

    q('#btn-audio-repeat').addEventListener('click', () => {
      const cur = this.store.getState().audio.repeat;
      const next = REPEAT_MODES[(REPEAT_MODES.indexOf(cur) + 1) % REPEAT_MODES.length];
      this.store.updateSection('audio', { repeat: next });
    });

    q('#btn-audio-mute').addEventListener('click', () => {
      const cur = this.store.getState().audio.muted;
      this.store.updateSection('audio', { muted: !cur });
    });

    q('#ctrl-audio-volume').addEventListener('input', (e) => {
      this.store.updateSection('audio', { volume: Number(e.target.value), muted: false });
    });

    const scrubEl = q('#ctrl-audio-scrub');
    scrubEl.addEventListener('pointerdown', () => {
      this._isScrubbing = true;
    });
    scrubEl.addEventListener('input', () => {
      this.audioEngine.seekByProgress(Number(scrubEl.value) / 1000);
    });
    scrubEl.addEventListener('change', () => {
      this._isScrubbing = false;
      this.audioEngine.seekByProgress(Number(scrubEl.value) / 1000);
    });

    q('#btn-audio-clear').addEventListener('click', () => {
      this.audioEngine.clearPlaylist();
    });

    q('#ctrl-audio-reactive').addEventListener('change', (e) => {
      this.store.updateSection('audio', { reactive: e.target.checked });
    });
    q('#ctrl-audio-bass').addEventListener('input', (e) => {
      this.store.updateSection('audio', { bassSensitivity: Number(e.target.value) });
    });
    q('#ctrl-audio-midtreble').addEventListener('input', (e) => {
      this.store.updateSection('audio', { midTrebleSensitivity: Number(e.target.value) });
    });

    q('#btn-camera-reset').addEventListener('click', () => {
      this.sceneEngine.resetViewOrientation();
      this.store.resetCamera();
    });
    q('#ctrl-cam-dist').addEventListener('input', (e) => {
      this.store.updateSection('camera', { distance: Number(e.target.value) });
    });
    q('#ctrl-cam-fov').addEventListener('input', (e) => {
      this.store.updateSection('camera', { fov: Number(e.target.value) });
    });
    q('#ctrl-cam-parallax').addEventListener('input', (e) => {
      this.store.updateSection('camera', { parallaxStrength: Number(e.target.value) });
    });
    q('#ctrl-cam-lock').addEventListener('change', (e) => {
      const locked = e.target.checked;
      this.store.updateSection('camera', {
        staticLock: locked,
        autoOrbit: locked ? false : this.store.getState().camera.autoOrbit
      });
    });
    q('#ctrl-cam-orbit').addEventListener('change', (e) => {
      const orbit = e.target.checked;
      this.store.updateSection('camera', {
        autoOrbit: orbit,
        staticLock: orbit ? false : this.store.getState().camera.staticLock
      });
    });
    q('#ctrl-cam-orbit-speed').addEventListener('input', (e) => {
      this.store.updateSection('camera', { orbitSpeed: Number(e.target.value) });
    });
    q('#ctrl-cam-sway').addEventListener('change', (e) => {
      this.store.updateSection('camera', { idleSway: e.target.checked });
    });

    q('#ctrl-fx-warp').addEventListener('change', (e) => {
      this.store.updateSection('effects', { warpActive: e.target.checked });
    });
    q('#ctrl-fx-warp-int').addEventListener('input', (e) => {
      this.store.updateSection('effects', { warpIntensity: Number(e.target.value) });
    });
    q('#ctrl-fx-flares').addEventListener('change', (e) => {
      this.store.updateSection('effects', { lensFlares: e.target.checked });
    });
    q('#ctrl-fx-flare-int').addEventListener('input', (e) => {
      this.store.updateSection('effects', { flareIntensity: Number(e.target.value) });
    });
    q('#ctrl-fx-vignette').addEventListener('input', (e) => {
      this.store.updateSection('effects', { vignetteStrength: Number(e.target.value) });
    });

    q('#btn-replay-intro').addEventListener('click', () => {
      this.signatureIntro.play();
    });
    q('#btn-upload-signature').addEventListener('click', () => {
      const input = document.getElementById('signature-svg-input');
      if (input) input.click();
    });
    q('#btn-reset-signature').addEventListener('click', () => {
      this.signatureIntro.resetDefaultSignature();
      this._syncSignatureStatus();
    });

    this._cleanups.push(this.store.subscribe(() => this.syncFromStore()));
    this._cleanups.push(this.presetManager.subscribe(() => this.syncPresets()));
    if (this.sceneEngine && typeof this.sceneEngine.onTextBuildReport === 'function') {
      this._cleanups.push(
        this.sceneEngine.onTextBuildReport((report) => this._syncTextFontStatus(report))
      );
    }
    this._cleanups.push(
      this.audioEngine.subscribe((type) => {
        if (type === 'playlistchange' || type === 'trackchange') {
          this.syncPlaylist();
        }
        this.syncAudioTransport();
      })
    );
  }

  syncAll() {
    this.refreshFontOptions();
    this.syncPresets();
    this.syncFromStore();
    this.syncPlaylist();
    this.syncAudioTransport();
    this._syncSignatureStatus();
  }

  refreshFontOptions() {
    const select = this.el ? this.el.querySelector('#ctrl-text-font') : null;
    if (!select) return;
    const fonts = this.sceneEngine ? this.sceneEngine.getAvailableFonts() : FONT_OPTIONS;
    const currentVal = this.store.getState().identity.text.font;
    select.innerHTML = fonts
      .map((f) => `<option value="${f.id}" ${f.id === currentVal ? 'selected' : ''}>${f.label}</option>`)
      .join('');

    const restoreBtn = this.el.querySelector('#btn-restore-fonts');
    if (restoreBtn && this.sceneEngine && this.sceneEngine.textBuilder) {
      restoreBtn.classList.toggle('hidden', !this.sceneEngine.textBuilder.hasDeletedBuiltins());
    }

    const listEl = this.el.querySelector('#custom-fonts-list');
    if (listEl && this.sceneEngine && this.sceneEngine.textBuilder) {
      const customList = this.sceneEngine.textBuilder.getCustomFonts();
      if (customList.length === 0) {
        listEl.classList.add('hidden');
        listEl.innerHTML = '';
      } else {
        listEl.classList.remove('hidden');
        listEl.innerHTML = customList
          .map(
            (cf) => `
            <div class="custom-font-chip ${cf.id === currentVal ? 'active' : ''}">
              <button type="button" class="custom-font-pick" data-pick-font="${cf.id}">${cf.label}</button>
              <button type="button" class="custom-font-del" data-del-font="${cf.id}" title="Delete Font">✕</button>
            </div>`
          )
          .join('');

        listEl.querySelectorAll('[data-pick-font]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-pick-font');
            this.store.updateSection('identity', { text: { font: id } });
            this.refreshFontOptions();
          });
        });

        listEl.querySelectorAll('[data-del-font]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-del-font');
            try {
              const res = this.sceneEngine.deleteFont(id);
              this.refreshFontOptions();
              this.syncFromStore();
              if (res) this.onNotify(`Deleted font: ${res.removedLabel}`, 'info');
            } catch (err) {
              this.onNotify(err.message, 'warning');
            }
          });
        });
      }
    }
  }

  _syncSignatureStatus() {
    const el = this.el.querySelector('#signature-file-status');
    if (!el) return;
    const customName = this.signatureIntro.getCustomSvgName();
    el.textContent = customName ? `Custom SVG: ${customName}` : 'Default ERATIS Signature SVG';
  }

  _syncTextFontStatus(report) {
    const el = this.el ? this.el.querySelector('#text-font-status') : null;
    if (!el) return;
    if (!report) {
      el.classList.add('hidden');
      el.textContent = '';
      return;
    }

    const parts = [];
    if (Array.isArray(report.missingChars) && report.missingChars.length > 0) {
      parts.push(`Unsupported: ${report.missingChars.join(' ')}`);
    }
    if (Array.isArray(report.fallbackChars) && report.fallbackChars.length > 0) {
      const fb = report.fallbackFontLabel || 'Unicode Fallback';
      parts.push(`Fallback (${fb}): ${report.fallbackChars.join(' ')}`);
    }

    if (parts.length > 0) {
      el.textContent = parts.join(' · ');
      el.title = el.textContent;
      el.classList.remove('hidden');
    } else {
      el.textContent = '';
      el.title = '';
      el.classList.add('hidden');
    }
  }

  syncPresets() {
    const select = this.el.querySelector('#preset-select');
    if (!select) return;
    const presets = this.presetManager.listPresets();
    const activeId = this.presetManager.activePresetId;

    select.innerHTML = presets
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === activeId ? 'selected' : ''}>${
            p.builtin ? '★ ' : '● '
          }${p.name}</option>`
      )
      .join('');
  }

  syncFromStore() {
    if (!this.el) return;
    const { identity, environment, audio, camera, effects } = this.store.getState();
    const q = (sel) => this.el.querySelector(sel);

    this.el.querySelectorAll('.seg-btn[data-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === identity.mode);
    });
    q('#identity-text-section').classList.toggle('hidden', identity.mode !== 'text');
    q('#identity-image-section').classList.toggle('hidden', identity.mode !== 'image');

    this.el.querySelectorAll('.material-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-material-id') === identity.material);
    });

    const textInput = q('#ctrl-text-value');
    if (document.activeElement !== textInput) {
      textInput.value = identity.text.value;
    }
    q('#ctrl-text-font').value = identity.text.font;
    q('#ctrl-text-spacing').value = identity.text.letterSpacing;
    q('#out-text-spacing').textContent = identity.text.letterSpacing.toFixed(2);
    q('#ctrl-text-slant').value = identity.text.italicSlant;
    q('#out-text-slant').textContent = identity.text.italicSlant.toFixed(2);
    q('#ctrl-text-depth').value = identity.text.depth;
    q('#out-text-depth').textContent = identity.text.depth.toFixed(2);
    q('#ctrl-text-bevel-size').value = identity.text.bevelSize;
    q('#out-text-bevel-size').textContent = identity.text.bevelSize.toFixed(3);
    q('#ctrl-text-bevel-thick').value = identity.text.bevelThickness;
    q('#out-text-bevel-thick').textContent = identity.text.bevelThickness.toFixed(3);

    q('#image-file-status').textContent = identity.image.fileName
      ? `Loaded: ${identity.image.fileName}`
      : 'No custom image loaded';
    q('#ctrl-img-opacity').value = identity.image.opacity;
    q('#out-img-opacity').textContent = identity.image.opacity.toFixed(2);
    q('#ctrl-img-scale').value = identity.image.scale;
    q('#out-img-scale').textContent = identity.image.scale.toFixed(2);

    q('#ctrl-show-orbits').checked = Boolean(identity.showOrbits);
    q('#ctrl-id-scale').value = identity.scale;
    q('#out-id-scale').textContent = identity.scale.toFixed(2);
    q('#ctrl-id-posx').value = identity.positionX;
    q('#out-id-posx').textContent = identity.positionX.toFixed(2);
    q('#ctrl-id-posy').value = identity.positionY;
    q('#out-id-posy').textContent = identity.positionY.toFixed(2);
    q('#ctrl-id-rotx').value = identity.rotationX;
    q('#out-id-rotx').textContent = `${Math.round(identity.rotationX)}°`;
    q('#ctrl-id-roty').value = identity.rotationY;
    q('#out-id-roty').textContent = `${Math.round(identity.rotationY)}°`;
    q('#ctrl-id-rotz').value = identity.rotationZ;
    q('#out-id-rotz').textContent = `${Math.round(identity.rotationZ)}°`;

    q('#ctrl-env-bg').value = environment.backgroundColor;
    q('#ctrl-env-exposure').value = environment.exposure;
    q('#out-env-exposure').textContent = environment.exposure.toFixed(2);
    q('#ctrl-env-reflection').value = environment.reflectionIntensity;
    q('#out-env-reflection').textContent = environment.reflectionIntensity.toFixed(2);
    q('#ctrl-env-key').value = environment.keyLightIntensity;
    q('#out-env-key').textContent = environment.keyLightIntensity.toFixed(2);
    q('#ctrl-env-rim').value = environment.rimLightIntensity;
    q('#out-env-rim').textContent = environment.rimLightIntensity.toFixed(2);
    q('#ctrl-env-cursor').value = environment.cursorLightIntensity;
    q('#out-env-cursor').textContent = environment.cursorLightIntensity.toFixed(2);
    q('#ctrl-env-fog').value = environment.fogDensity;
    q('#out-env-fog').textContent = environment.fogDensity.toFixed(4);
    q('#ctrl-env-stars-enabled').checked = Boolean(environment.starfieldEnabled);
    q('#ctrl-env-star-count').value = environment.starCount;
    q('#out-env-star-count').textContent = String(environment.starCount);
    q('#ctrl-env-star-speed').value = environment.starSpeed;
    q('#out-env-star-speed').textContent = environment.starSpeed.toFixed(2);
    q('#ctrl-env-star-size').value = environment.starSize;
    q('#out-env-star-size').textContent = environment.starSize.toFixed(2);
    q('#ctrl-env-star-bright').value = environment.starBrightness;
    q('#out-env-star-bright').textContent = environment.starBrightness.toFixed(2);

    q('#ctrl-audio-reactive').checked = Boolean(audio.reactive);
    q('#ctrl-audio-bass').value = audio.bassSensitivity;
    q('#out-audio-bass').textContent = audio.bassSensitivity.toFixed(2);
    q('#ctrl-audio-midtreble').value = audio.midTrebleSensitivity;
    q('#out-audio-midtreble').textContent = audio.midTrebleSensitivity.toFixed(2);
    q('#ctrl-audio-volume').value = audio.volume;
    q('#btn-audio-mute').textContent = audio.muted ? 'Unmute' : 'Mute';
    q('#btn-audio-shuffle').classList.toggle('active', Boolean(audio.shuffle));
    q('#btn-audio-repeat').textContent = `REP: ${audio.repeat.toUpperCase()}`;
    q('#btn-audio-repeat').classList.toggle('active', audio.repeat !== 'off');

    q('#ctrl-cam-dist').value = camera.distance;
    q('#out-cam-dist').textContent = camera.distance.toFixed(1);
    q('#ctrl-cam-fov').value = camera.fov;
    q('#out-cam-fov').textContent = `${Math.round(camera.fov)}°`;
    q('#ctrl-cam-parallax').value = camera.parallaxStrength;
    q('#out-cam-parallax').textContent = camera.parallaxStrength.toFixed(2);
    q('#ctrl-cam-lock').checked = Boolean(camera.staticLock);
    q('#ctrl-cam-orbit').checked = Boolean(camera.autoOrbit);
    q('#ctrl-cam-orbit-speed').value = camera.orbitSpeed;
    q('#out-cam-orbit-speed').textContent = camera.orbitSpeed.toFixed(2);
    q('#ctrl-cam-sway').checked = Boolean(camera.idleSway);

    q('#ctrl-fx-warp').checked = Boolean(effects.warpActive);
    q('#ctrl-fx-warp-int').value = effects.warpIntensity;
    q('#out-fx-warp-int').textContent = effects.warpIntensity.toFixed(2);
    q('#ctrl-fx-flares').checked = Boolean(effects.lensFlares);
    q('#ctrl-fx-flare-int').value = effects.flareIntensity;
    q('#out-fx-flare-int').textContent = effects.flareIntensity.toFixed(2);
    q('#ctrl-fx-vignette').value = effects.vignetteStrength;
    q('#out-fx-vignette').textContent = effects.vignetteStrength.toFixed(2);
  }

  syncPlaylist() {
    const listEl = this.el.querySelector('#audio-playlist');
    const countEl = this.el.querySelector('#playlist-count');
    if (!listEl || !countEl) return;

    const playlist = this.audioEngine.getPlaylist();
    const currentIndex = this.audioEngine.getCurrentIndex();
    countEl.textContent = String(playlist.length);

    if (playlist.length === 0) {
      listEl.innerHTML = `<div class="playlist-empty">Drop .MP3 / .WAV / .OGG / .FLAC files anywhere or click "+ ADD TRACKS"</div>`;
      return;
    }

    listEl.innerHTML = playlist
      .map(
        (t, idx) => `
        <div class="playlist-item ${idx === currentIndex ? 'active' : ''}" data-track-idx="${idx}">
          <button type="button" class="playlist-select-btn" data-select-track="${idx}">
            <span class="playlist-idx">${String(idx + 1).padStart(2, '0')}</span>
            <span class="playlist-name">${t.name}</span>
            <span class="playlist-dur">${t.duration ? formatTime(t.duration) : ''}</span>
          </button>
          <button type="button" class="playlist-remove-btn" data-remove-track="${idx}" title="Remove Track">✕</button>
        </div>`
      )
      .join('');

    listEl.querySelectorAll('[data-select-track]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-select-track'));
        this.audioEngine.selectTrack(idx, true);
      });
    });

    listEl.querySelectorAll('[data-remove-track]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-remove-track'));
        this.audioEngine.removeTrack(idx);
      });
    });
  }

  syncAudioTransport() {
    if (!this.el) return;
    const snap = this.audioEngine.getPlaybackSnapshot();
    const titleEl = this.el.querySelector('#audio-now-playing');
    const playBtn = this.el.querySelector('#btn-audio-play');
    const curEl = this.el.querySelector('#audio-time-current');
    const totEl = this.el.querySelector('#audio-time-total');
    const scrubEl = this.el.querySelector('#ctrl-audio-scrub');

    if (titleEl) {
      titleEl.textContent = snap.track
        ? `${snap.isPlaying ? '▶ ' : '❚❚ '}${snap.track.name}`
        : 'No track loaded — drop or add audio files';
    }
    if (playBtn) {
      playBtn.textContent = snap.isPlaying ? 'PAUSE' : 'PLAY';
    }
    if (curEl) curEl.textContent = formatTime(snap.currentTime);
    if (totEl) totEl.textContent = formatTime(snap.duration);

    if (scrubEl && !this._isScrubbing) {
      const ratio = snap.duration > 0 ? snap.currentTime / snap.duration : 0;
      scrubEl.value = String(Math.round(ratio * 1000));
    }
  }

  _startMeterLoop() {
    if (this._meterRaf !== null) return;
    const updateMeters = () => {
      if (!this.isOpen) {
        this._meterRaf = null;
        return;
      }
      this._meterRaf = requestAnimationFrame(updateMeters);
      const levels = this.audioEngine.levels;
      const bPct = Math.round(Math.min(1, levels.bass) * 100);
      const mPct = Math.round(Math.min(1, levels.mid) * 100);
      const tPct = Math.round(Math.min(1, levels.treble) * 100);

      const bFill = this.el.querySelector('#meter-fill-bass');
      const mFill = this.el.querySelector('#meter-fill-mid');
      const tFill = this.el.querySelector('#meter-fill-treble');
      const bVal = this.el.querySelector('#meter-val-bass');
      const mVal = this.el.querySelector('#meter-val-mid');
      const tVal = this.el.querySelector('#meter-val-treble');

      if (bFill) bFill.style.width = `${bPct}%`;
      if (mFill) mFill.style.width = `${mPct}%`;
      if (tFill) tFill.style.width = `${tPct}%`;
      if (bVal) bVal.textContent = `${bPct}%`;
      if (mVal) mVal.textContent = `${mPct}%`;
      if (tVal) tVal.textContent = `${tPct}%`;
    };
    this._meterRaf = requestAnimationFrame(updateMeters);
  }

  _stopMeterLoop() {
    if (this._meterRaf !== null) {
      cancelAnimationFrame(this._meterRaf);
      this._meterRaf = null;
    }
  }

  dispose() {
    this._stopMeterLoop();
    for (const fn of this._cleanups) {
      fn();
    }
    this._cleanups = [];
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
  }
}
