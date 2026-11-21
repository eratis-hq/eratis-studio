import { APP_INFO, MATERIAL_CATALOG } from '../core/config.js';

const POPOVER_CONFIG = {
  brand: {
    title: 'ERATIS IDENTITY STUDIO',
    shortcut: 'GITHUB ↗'
  },
  orbit: {
    title: '360° AUTO-ORBIT SPEED',
    shortcut: 'KEY [O]'
  },
  lock: {
    title: 'POSE LOCK & ALIGNMENT',
    shortcut: 'KEY [L]'
  },
  warp: {
    title: 'HYPERDRIVE WARP INTENSITY',
    shortcut: 'KEY [W]'
  },
  audio: {
    title: 'WEB AUDIO PLAYER & FFT',
    shortcut: 'SPACE'
  },
  mat: {
    title: '3D SURFACE MATERIAL',
    shortcut: '6 FINISHES'
  },
  eratis: {
    title: '3D IDENTITY MODE',
    shortcut: 'MODE'
  },
  export: {
    title: 'QUICK WALLPAPER & EXPORT',
    shortcut: '4K · PNG'
  },
  reset: {
    title: 'RESET SCENE & PARAMETERS',
    shortcut: 'KEY [R]'
  },
  zen: {
    title: 'CINEMA ZEN VIEWPORT',
    shortcut: 'KEY [H]'
  },
  studio: {
    title: 'STUDIO SECTIONS',
    shortcut: 'KEY [S]'
  },
  rec: {
    title: 'LIVE WEBM RECORDING',
    shortcut: 'REC ●'
  }
};

export class ControlDock {
  constructor({
    store,
    sceneEngine,
    audioEngine,
    signatureIntro,
    onToggleStudio,
    onOpenStudioTab,
    onToggleExport,
    onQuickExport,
    onTriggerAudioLoad,
    onTriggerFontLoad,
    onTriggerImageLoad,
    onStopRecording,
    onNotify
  }) {
    this.store = store;
    this.sceneEngine = sceneEngine;
    this.audioEngine = audioEngine;
    this.signatureIntro = signatureIntro;
    this.onToggleStudio = onToggleStudio || (() => {});
    this.onOpenStudioTab = onOpenStudioTab || (() => {});
    this.onToggleExport = onToggleExport || (() => {});
    this.onQuickExport = onQuickExport || (() => {});
    this.onTriggerAudioLoad = onTriggerAudioLoad || (() => {});
    this.onTriggerFontLoad = onTriggerFontLoad || (() => {});
    this.onTriggerImageLoad = onTriggerImageLoad || (() => {});
    this.onStopRecording = onStopRecording || (() => {});
    this.onNotify = onNotify || (() => {});

    this.el = null;
    this.popoverEl = null;
    this.restorePill = null;

    this.studioOpen = false;
    this.uiHidden = false;
    this.mobileMenuOpen = false;
    this._activeKey = null;
    this._activeTargetEl = null;
    this._hideTimer = null;
    this._cleanups = [];

    this._build();
    this._bind();
    this.sync();
  }

  _build() {
    const dock = document.createElement('div');
    dock.className = 'bottom-dock';
    dock.innerHTML = `

      <div id="dock-popover-menu" class="dock-popover-menu" role="region" aria-label="Control Options" aria-hidden="true">
        <div class="popover-header">
          <div class="popover-title-wrap">
            <span class="popover-dot"></span>
            <span class="popover-title" id="popover-title">360° AUTO-ORBIT SPEED</span>
          </div>
          <kbd class="popover-kbd" id="popover-kbd">KEY [O]</kbd>
        </div>
        <div class="popover-actions" id="popover-actions"></div>
      </div>

      <div class="eratis-dock-shell" id="eratis-dynamic-island">
        <div class="island-pill-bar" id="eratis-dock-pill">

          <a
            href="${APP_INFO.githubUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="brand-link"
            data-hover-key="brand"
            aria-label="ERATIS GitHub Profile"
          >
            <span class="brand-dot"></span>
            <span class="brand-text">MADE BY <strong class="brand-eratis-bold">ERATIS</strong></span>
            <span class="dock-divider"></span>
            <span class="github-link">
              <svg class="github-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span class="github-text">${APP_INFO.githubHandle}</span>
            </span>
          </a>

          <span class="dock-divider"></span>

          <div class="dock-group dock-group-primary">
            <button id="dock-btn-orbit" class="micro-btn kinetic-btn" data-hover-key="orbit" type="button" aria-label="360° Auto-Orbit">
              <svg class="btn-kinetic-svg glyph-360" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path class="g360-ring" d="M 1.8 9 C 3.8 5.3, 14.2 5.3, 16.2 9 C 14.2 12.7, 3.8 12.7, 1.8 9 Z" stroke="currentColor" stroke-width="1.3" />
                <path class="g360-arc" d="M 5.6 7.4 A 3.6 3.6 0 1 1 5.4 10.4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
                <circle class="g360-core" cx="9" cy="9" r="1.4" fill="currentColor" />
              </svg>
              <span class="label-360">360°</span>
            </button>

            <button id="dock-btn-lock" class="micro-btn kinetic-btn" data-hover-key="lock" type="button" aria-label="Static Pose Lock">
              <svg class="btn-kinetic-svg glyph-lock" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect class="glock-body" x="4.2" y="8.2" width="9.6" height="7.2" rx="1.8" stroke="currentColor" stroke-width="1.4" />
                <path class="glock-shackle" d="M 6.2 8.2 V 5.6 A 2.8 2.8 0 0 1 11.8 5.6 V 8.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                <circle class="glock-keyhole" cx="9" cy="11.8" r="1.1" fill="currentColor" />
              </svg>
              <span>LOCK</span>
            </button>

            <button id="dock-btn-warp" class="micro-btn kinetic-btn" data-hover-key="warp" type="button" aria-label="Warp Hyperdrive">
              <svg class="btn-kinetic-svg glyph-warp" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path class="gwarp-rays" d="M 9 2.0 L 9 5.2 M 9 12.8 L 9 16.0 M 2.0 9 L 5.2 9 M 12.8 9 L 16.0 9 M 4.0 4.0 L 6.4 6.4 M 11.6 11.6 L 14.0 14.0 M 14.0 4.0 L 11.6 6.4 M 6.4 11.6 L 4.0 14.0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                <circle class="gwarp-core" cx="9" cy="9" r="1.5" fill="currentColor" />
              </svg>
              <span>WARP</span>
            </button>

            <button id="dock-btn-audio" class="micro-btn kinetic-btn" data-hover-key="audio" type="button" aria-label="Audio Engine">
              <svg class="btn-kinetic-svg glyph-audio" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                <rect class="gaudio-b1" x="2.5" y="7.5" width="2.0" height="6.5" rx="1" />
                <rect class="gaudio-b2" x="6.2" y="3.8" width="2.0" height="10.2" rx="1" />
                <rect class="gaudio-b3" x="9.9" y="5.8" width="2.0" height="8.2" rx="1" />
                <rect class="gaudio-b4" x="13.6" y="4.5" width="2.0" height="9.5" rx="1" />
              </svg>
              <span id="dock-audio-label">AUDIO</span>
            </button>

            <button id="dock-btn-mat" class="micro-btn kinetic-btn" data-hover-key="mat" type="button" aria-label="Surface Material">
              <svg class="btn-kinetic-svg glyph-chrome" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <g class="gchrome-rotor">
                  <circle cx="9" cy="9" r="6.4" stroke="currentColor" stroke-width="1.4" />
                  <line x1="9" y1="6.5" x2="14.5" y2="6.5" stroke="currentColor" stroke-width="1.25" />
                  <line x1="6.8" y1="10.3" x2="4.1" y2="15.0" stroke="currentColor" stroke-width="1.25" />
                  <line x1="11.2" y1="10.3" x2="13.8" y2="15.0" stroke="currentColor" stroke-width="1.25" />
                </g>
                <circle class="gchrome-core" cx="9" cy="9" r="2.4" stroke="currentColor" stroke-width="1.3" />
              </svg>
              <span id="dock-mat-label">CHROME</span>
            </button>

            <button id="dock-btn-reset-eratis" class="micro-btn kinetic-btn accent hidden" data-hover-key="eratis" type="button" aria-label="Return to Default 3D ERATIS Emblem">
              <svg class="btn-kinetic-svg glyph-eratis" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path class="geratis-ring" d="M 3 12 C 1 8, 6 4, 15 5 M 15 6 C 17 10, 12 14, 3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <circle class="geratis-core" cx="9" cy="9" r="2" fill="currentColor" />
              </svg>
              <span>ERATIS</span>
            </button>
          </div>

          <span class="dock-divider dock-divider-secondary"></span>

          <div class="dock-group dock-group-secondary" id="dock-group-secondary">
            <button id="dock-btn-export" class="micro-btn kinetic-btn" data-hover-key="export" type="button" aria-label="Wallpaper & Export Studio">
              <svg class="btn-kinetic-svg glyph-export" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path class="gexport-frame" d="M 3.2 6.5 L 3.2 3.2 L 6.5 3.2 M 14.8 6.5 L 14.8 3.2 L 11.5 3.2 M 3.2 11.5 L 3.2 14.8 L 6.5 14.8 M 14.8 11.5 L 14.8 14.8 L 11.5 14.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                <path class="gexport-arrow" d="M 7.2 10.8 L 11.2 6.8 M 8.2 6.8 H 11.2 V 9.8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>EXPORT</span>
            </button>

            <button id="dock-btn-reset-all" class="micro-btn kinetic-btn" data-hover-key="reset" type="button" aria-label="Reset All Settings">
              <svg class="btn-kinetic-svg glyph-reset" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path class="greset-spin" d="M 3.6 9 A 5.4 5.4 0 1 1 5.3 13.0 M 3.4 13.4 L 3.4 9.2 L 7.4 9.2" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>RESET</span>
            </button>

            <button id="dock-btn-zen" class="micro-btn kinetic-btn" data-hover-key="zen" type="button" aria-label="Hide UI">
              <svg class="btn-kinetic-svg glyph-zen" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <g class="gzen-lid">
                  <path d="M 2.0 9 C 4.0 5.3, 14.0 5.3, 16.0 9 C 14.0 12.7, 4.0 12.7, 2.0 9 Z" stroke="currentColor" stroke-width="1.35" />
                  <circle class="gzen-pupil" cx="9" cy="9" r="2.1" stroke="currentColor" stroke-width="1.35" />
                </g>
                <line class="gzen-slash" x1="3.5" y1="14.5" x2="14.5" y2="3.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
              </svg>
              <span>HIDE</span>
            </button>
          </div>

          <button id="dock-btn-more" class="micro-btn dock-more-btn" type="button" title="More Controls" aria-label="More Controls">
            <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <circle cx="4.5" cy="9" r="1.4" />
              <circle cx="9" cy="9" r="1.4" />
              <circle cx="13.5" cy="9" r="1.4" />
            </svg>
          </button>

          <button id="dock-rec-badge" class="micro-btn kinetic-btn rec-pill hidden" data-hover-key="rec" type="button" aria-label="Stop WebM Recording">
            <span class="rec-dot"></span>
            <span>REC</span>
          </button>

          <span class="dock-divider"></span>

          <button id="dock-btn-studio" class="micro-btn studio-cta-btn" data-hover-key="studio" type="button" aria-label="Toggle Studio Mode">
            <svg class="btn-kinetic-svg glyph-studio" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <line x1="2.5" y1="5" x2="15.5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle class="gstudio-k1" cx="6.5" cy="5" r="1.9" fill="currentColor" />
              <line x1="2.5" y1="9" x2="15.5" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle class="gstudio-k2" cx="11.5" cy="9" r="1.9" fill="currentColor" />
              <line x1="2.5" y1="13" x2="15.5" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <circle class="gstudio-k3" cx="8.0" cy="13" r="1.9" fill="currentColor" />
            </svg>
            <span>STUDIO</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);
    this.el = dock;
    this.popoverEl = dock.querySelector('#dock-popover-menu');

    const restorePill = document.createElement('button');
    restorePill.id = 'ui-restore-pill';
    restorePill.type = 'button';
    restorePill.className = 'ui-restore-pill hidden';
    restorePill.innerHTML = `<span class="brand-dot"></span><span>SHOW ERATIS UI</span><kbd>H</kbd>`;
    restorePill.addEventListener('click', () => this.setUiHidden(false));
    document.body.appendChild(restorePill);
    this.restorePill = restorePill;
  }

  _bind() {
    const q = (sel) => this.el.querySelector(sel);

    q('#dock-btn-orbit').addEventListener('click', () => {
      const cam = this.store.getState().camera;
      const nextOrbit = !cam.autoOrbit;
      this.store.updateSection('camera', {
        autoOrbit: nextOrbit,
        staticLock: nextOrbit ? false : cam.staticLock
      });
    });

    q('#dock-btn-lock').addEventListener('click', () => {
      const cam = this.store.getState().camera;
      const nextLock = !cam.staticLock;
      this.store.updateSection('camera', {
        staticLock: nextLock,
        autoOrbit: nextLock ? false : cam.autoOrbit
      });
    });

    q('#dock-btn-warp').addEventListener('click', () => {
      const current = this.store.getState().effects.warpActive;
      this.store.updateSection('effects', { warpActive: !current });
    });

    q('#dock-btn-audio').addEventListener('click', () => {
      if (this.audioEngine.getPlaylist().length === 0) {
        this.onTriggerAudioLoad();
      } else {
        this.audioEngine.togglePlay();
      }
    });

    q('#dock-btn-mat').addEventListener('click', () => {
      const ids = Object.keys(MATERIAL_CATALOG);
      const cur = this.store.getState().identity.material;
      const next = ids[(ids.indexOf(cur) + 1) % ids.length];
      this.store.updateSection('identity', { material: next });
      const label = MATERIAL_CATALOG[next] ? MATERIAL_CATALOG[next].label : next;
      this.onNotify(`Material: ${label}`, 'info');
    });

    q('#dock-btn-reset-eratis').addEventListener('click', () => {
      this.store.resetIdentityToEratis();
    });

    q('#dock-btn-export').addEventListener('click', () => {
      this._closeMobileMenu();
      this._hidePopoverImmediate();
      this.onToggleExport();
    });

    q('#dock-btn-reset-all').addEventListener('click', () => {
      this._closeMobileMenu();
      this._triggerFullFactoryReset();
    });

    q('#dock-btn-zen').addEventListener('click', () => {
      this._closeMobileMenu();
      this.toggleUiHidden();
    });

    q('#dock-btn-studio').addEventListener('click', () => {
      this._closeMobileMenu();
      this._hidePopoverImmediate();
      this.onToggleStudio();
    });

    q('#dock-rec-badge').addEventListener('click', () => {
      this.onStopRecording();
    });

    const hoverTargets = this.el.querySelectorAll('[data-hover-key]');
    hoverTargets.forEach((target) => {
      target.addEventListener('pointerenter', () => {
        this._cancelHideTimer();
        const key = target.getAttribute('data-hover-key');
        this._showPopover(key, target);
      });

      target.addEventListener('focus', () => {
        this._cancelHideTimer();
        const key = target.getAttribute('data-hover-key');
        this._showPopover(key, target);
      });

      target.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
          this._cancelHideTimer();
          const key = target.getAttribute('data-hover-key');
          this._showPopover(key, target);
        }
      });
    });

    this.popoverEl.addEventListener('pointerenter', () => {
      this._cancelHideTimer();
    });

    this.popoverEl.addEventListener('pointerleave', () => {
      this._scheduleHidePopover();
    });

    this.el.addEventListener('pointerleave', () => {
      this._scheduleHidePopover();
    });

    const btnMore = q('#dock-btn-more');
    if (btnMore) {
      btnMore.addEventListener('click', (e) => {
        e.stopPropagation();
        this._hidePopoverImmediate();
        this.mobileMenuOpen = !this.mobileMenuOpen;
        this.el.classList.toggle('mobile-menu-open', this.mobileMenuOpen);
        btnMore.classList.toggle('active', this.mobileMenuOpen);
      });
    }

    const onDocPointerDown = (e) => {
      if (this.el && !this.el.contains(e.target)) {
        this._closeMobileMenu();
        this._hidePopoverImmediate();
      }
    };
    const onResize = () => {
      if (this._activeKey && this._activeTargetEl && this.popoverEl.classList.contains('visible')) {
        this._positionPopover(this._activeTargetEl);
      }
    };

    window.addEventListener('pointerdown', onDocPointerDown);
    window.addEventListener('resize', onResize);
    this._cleanups.push(() => {
      window.removeEventListener('pointerdown', onDocPointerDown);
      window.removeEventListener('resize', onResize);
    });

    this._cleanups.push(this.store.subscribe(() => this.sync()));
    this._cleanups.push(this.audioEngine.subscribe(() => this.sync()));
  }

  _cancelHideTimer() {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  _scheduleHidePopover() {
    this._cancelHideTimer();
    this._hideTimer = setTimeout(() => {
      this._hidePopoverImmediate();
    }, 240);
  }

  _hidePopoverImmediate() {
    this._cancelHideTimer();
    if (!this.popoverEl) return;
    this.popoverEl.classList.remove('visible');
    this.popoverEl.setAttribute('aria-hidden', 'true');
  }

  _showPopover(key, targetEl) {
    const cfg = POPOVER_CONFIG[key];
    if (!cfg || !this.popoverEl || !targetEl) return;

    this._activeKey = key;
    this._activeTargetEl = targetEl;

    const titleEl = this.popoverEl.querySelector('#popover-title');
    const kbdEl = this.popoverEl.querySelector('#popover-kbd');

    titleEl.textContent = cfg.title;
    kbdEl.textContent = cfg.shortcut;

    this._renderPopoverActions(key);

    this.popoverEl.classList.add('visible');
    this.popoverEl.setAttribute('aria-hidden', 'false');
    this._positionPopover(targetEl);
  }

  _positionPopover(targetEl) {
    if (!this.popoverEl || !this.el || !targetEl) return;
    const dockRect = this.el.getBoundingClientRect();
    const btnRect = targetEl.getBoundingClientRect();
    const popWidth = this.popoverEl.offsetWidth || 300;
    const vw = window.innerWidth;
    const margin = 14;

    const btnCenterViewportX = btnRect.left + btnRect.width * 0.5;
    const minCenterViewportX = margin + popWidth * 0.5;
    const maxCenterViewportX = vw - margin - popWidth * 0.5;
    const clampedCenterViewportX = Math.max(
      minCenterViewportX,
      Math.min(maxCenterViewportX, btnCenterViewportX)
    );

    const localLeft = clampedCenterViewportX - dockRect.left;
    const arrowOffsetPx = Math.max(
      18,
      Math.min(popWidth - 18, btnCenterViewportX - (clampedCenterViewportX - popWidth * 0.5))
    );

    this.popoverEl.style.left = `${localLeft.toFixed(1)}px`;
    this.popoverEl.style.setProperty('--popover-arrow-x', `${arrowOffsetPx.toFixed(1)}px`);
  }

  _renderPopoverActions(key) {
    const host = this.popoverEl ? this.popoverEl.querySelector('#popover-actions') : null;
    if (!host) return;
    const state = this.store.getState();

    if (key === 'brand') {
      host.innerHTML = `
        <a href="${APP_INFO.githubUrl}" target="_blank" rel="noopener noreferrer" class="popover-option-btn active">GitHub @eratis-hq ↗</a>
        <button type="button" class="popover-option-btn" data-pop-cmd="replay-intro">Replay Signature Intro</button>
      `;
    } else if (key === 'orbit') {
      const speeds = [
        { label: '0.35x Slow', val: 0.35 },
        { label: '0.55x Normal', val: 0.55 },
        { label: '1.10x Fast', val: 1.1 },
        { label: '1.80x Turbo', val: 1.8 }
      ];
      host.innerHTML = `
        <button type="button" class="popover-option-btn ${!state.camera.autoOrbit ? 'active' : ''}" data-pop-cmd="orbit-off">Off</button>
        ${speeds
          .map(
            (s) =>
              `<button type="button" class="popover-option-btn ${
                state.camera.autoOrbit && Math.abs(state.camera.orbitSpeed - s.val) < 0.05 ? 'active' : ''
              }" data-orbit-speed="${s.val}">${s.label}</button>`
          )
          .join('')}
      `;
    } else if (key === 'lock') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn ${state.camera.staticLock ? 'active' : ''}" data-pop-cmd="lock-on">Lock Pose</button>
        <button type="button" class="popover-option-btn ${!state.camera.staticLock ? 'active' : ''}" data-pop-cmd="lock-off">Free Sway</button>
        <button type="button" class="popover-option-btn" data-pop-cmd="snap-center">Center Angle (0, 0)</button>
      `;
    } else if (key === 'warp') {
      const powers = [
        { label: '1.0x Cruise', val: 1.0 },
        { label: '1.6x Hyper', val: 1.6 },
        { label: '2.4x Max', val: 2.4 }
      ];
      host.innerHTML = `
        <button type="button" class="popover-option-btn ${!state.effects.warpActive ? 'active' : ''}" data-pop-cmd="warp-off">Off</button>
        ${powers
          .map(
            (p) =>
              `<button type="button" class="popover-option-btn ${
                state.effects.warpActive && Math.abs(state.effects.warpIntensity - p.val) < 0.1 ? 'active' : ''
              }" data-warp-power="${p.val}">${p.label}</button>`
          )
          .join('')}
      `;
    } else if (key === 'audio') {
      const snap = this.audioEngine.getPlaybackSnapshot();
      const hasTracks = this.audioEngine.getPlaylist().length > 0;
      const muted = Boolean(state.audio.muted);
      host.innerHTML = `
        ${
          hasTracks
            ? `
          <button type="button" class="popover-option-btn" data-pop-cmd="audio-prev">⏮ Prev</button>
          <button type="button" class="popover-option-btn ${snap.isPlaying ? 'active' : ''}" data-pop-cmd="audio-toggle">
            ${snap.isPlaying ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button type="button" class="popover-option-btn" data-pop-cmd="audio-next">⏭ Next</button>
          <button type="button" class="popover-option-btn ${muted ? 'active' : ''}" data-pop-cmd="audio-mute">
            ${muted ? 'Unmute' : 'Mute'}
          </button>`
            : ''
        }
        <button type="button" class="popover-option-btn accent" data-pop-cmd="audio-add">+ Load Audio (.MP3 / .WAV)</button>
      `;
    } else if (key === 'mat') {
      host.innerHTML = Object.values(MATERIAL_CATALOG)
        .map(
          (m) => `
          <button type="button" class="popover-option-btn ${state.identity.material === m.id ? 'active' : ''}" data-mat-pick="${m.id}">
            <span class="chip-swatch" style="background: ${m.swatch}"></span>
            <span>${m.label}</span>
          </button>`
        )
        .join('');
    } else if (key === 'eratis') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn ${state.identity.mode === 'eratis' ? 'active' : ''}" data-pop-cmd="reset-eratis">3D ERATIS Emblem</button>
        <button type="button" class="popover-option-btn ${state.identity.mode === 'text' ? 'active' : ''}" data-pop-cmd="mode-text">3D Custom Text</button>
        <button type="button" class="popover-option-btn ${state.identity.mode === 'image' ? 'active' : ''}" data-pop-cmd="mode-image">Image Layer</button>
      `;
    } else if (key === 'export') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn active" data-quick-export="wallpaper-4k">4K UHD (3840×2160)</button>
        <button type="button" class="popover-option-btn" data-quick-export="wallpaper-16-9">16:9 Full HD</button>
        <button type="button" class="popover-option-btn" data-quick-export="wallpaper-21-9">21:9 Ultrawide</button>
        <button type="button" class="popover-option-btn" data-quick-export="wallpaper-9-16">9:16 Mobile</button>
        <button type="button" class="popover-option-btn" data-quick-export="profile-1-1">1:1 Square</button>
        <button type="button" class="popover-option-btn" data-quick-export="png-transparent">Alpha PNG</button>
      `;
    } else if (key === 'reset') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn" data-pop-cmd="snap-center">Reset Camera Angle</button>
        <button type="button" class="popover-option-btn" data-pop-cmd="reset-eratis">Reset to ERATIS Logo</button>
        <button type="button" class="popover-option-btn active" data-pop-cmd="factory-reset-all">Factory Reset All</button>
      `;
    } else if (key === 'zen') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn active" data-pop-cmd="enter-zen">Hide All UI Panels [H]</button>
      `;
    } else if (key === 'studio') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn" data-studio-tab="identity">Identity</button>
        <button type="button" class="popover-option-btn" data-studio-tab="environment">Environment</button>
        <button type="button" class="popover-option-btn" data-studio-tab="audio">Audio</button>
        <button type="button" class="popover-option-btn" data-studio-tab="camera">Camera</button>
        <button type="button" class="popover-option-btn" data-studio-tab="effects">Effects</button>
      `;
    } else if (key === 'rec') {
      host.innerHTML = `
        <button type="button" class="popover-option-btn active" data-pop-cmd="stop-rec">Stop &amp; Save WebM Video</button>
      `;
    }

    this._bindPopoverActionClicks(host);
  }

  _bindPopoverActionClicks(host) {
    host.querySelectorAll('[data-orbit-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = Number(btn.getAttribute('data-orbit-speed'));
        this.store.updateSection('camera', { autoOrbit: true, staticLock: false, orbitSpeed: speed });
        this._renderPopoverActions('orbit');
      });
    });

    host.querySelectorAll('[data-warp-power]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const power = Number(btn.getAttribute('data-warp-power'));
        this.store.updateSection('effects', { warpActive: true, warpIntensity: power });
        this._renderPopoverActions('warp');
      });
    });

    host.querySelectorAll('[data-mat-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const matId = btn.getAttribute('data-mat-pick');
        this.store.updateSection('identity', { material: matId });
        this._renderPopoverActions('mat');
      });
    });

    host.querySelectorAll('[data-studio-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-studio-tab');
        this._hidePopoverImmediate();
        this.onOpenStudioTab(tab);
      });
    });

    host.querySelectorAll('[data-quick-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-quick-export');
        this.onQuickExport(type);
      });
    });

    host.querySelectorAll('[data-pop-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-pop-cmd');
        if (cmd === 'replay-intro') {
          this._hidePopoverImmediate();
          if (this.signatureIntro) this.signatureIntro.play();
        } else if (cmd === 'reset-eratis') {
          this.store.resetIdentityToEratis();
          this.sceneEngine.resetViewOrientation();
          this._renderPopoverActions(this._activeKey);
        } else if (cmd === 'orbit-off') {
          this.store.updateSection('camera', { autoOrbit: false });
          this._renderPopoverActions('orbit');
        } else if (cmd === 'lock-on') {
          this.store.updateSection('camera', { staticLock: true, autoOrbit: false });
          this._renderPopoverActions('lock');
        } else if (cmd === 'lock-off') {
          this.store.updateSection('camera', { staticLock: false });
          this._renderPopoverActions('lock');
        } else if (cmd === 'snap-center') {
          this.sceneEngine.resetViewOrientation();
          this._renderPopoverActions(this._activeKey);
        } else if (cmd === 'warp-off') {
          this.store.updateSection('effects', { warpActive: false });
          this._renderPopoverActions('warp');
        } else if (cmd === 'audio-prev') {
          this.audioEngine.prevTrack();
        } else if (cmd === 'audio-toggle') {
          this.audioEngine.togglePlay();
        } else if (cmd === 'audio-next') {
          this.audioEngine.nextTrack(true);
        } else if (cmd === 'audio-mute') {
          const cur = this.store.getState().audio.muted;
          this.store.updateSection('audio', { muted: !cur });
          this._renderPopoverActions('audio');
        } else if (cmd === 'audio-add') {
          this.onTriggerAudioLoad();
        } else if (cmd === 'mode-text') {
          this.store.updateSection('identity', { mode: 'text' });
          this._hidePopoverImmediate();
          this.onOpenStudioTab('identity');
        } else if (cmd === 'mode-image') {
          this.onTriggerImageLoad();
        } else if (cmd === 'enter-zen') {
          this._hidePopoverImmediate();
          this.setUiHidden(true);
        } else if (cmd === 'factory-reset-all') {
          this._triggerFullFactoryReset();
          this._renderPopoverActions(this._activeKey);
        } else if (cmd === 'stop-rec') {
          this._hidePopoverImmediate();
          this.onStopRecording();
        }
      });
    });
  }

  _closeMobileMenu() {
    if (!this.mobileMenuOpen) return;
    this.mobileMenuOpen = false;
    if (this.el) {
      this.el.classList.remove('mobile-menu-open');
      const btnMore = this.el.querySelector('#dock-btn-more');
      if (btnMore) btnMore.classList.remove('active');
    }
  }

  toggleUiHidden() {
    this.setUiHidden(!this.uiHidden);
  }

  _triggerFullFactoryReset() {
    this.store.resetAll();
    if (this.sceneEngine) {
      this.sceneEngine.resetViewOrientation();
    }
    this.onNotify('All settings restored to factory ERATIS defaults.', 'success');
  }

  setUiHidden(hidden) {
    this.uiHidden = Boolean(hidden);
    document.body.classList.toggle('ui-zen-hidden', this.uiHidden);
    if (this.restorePill) {
      this.restorePill.classList.toggle('hidden', !this.uiHidden);
    }
    if (this.uiHidden) {
      this._closeMobileMenu();
      this._hidePopoverImmediate();
      this.onNotify('Cinema Zen Mode active — Press [H] anytime to restore UI.', 'info');
    }
  }

  setStudioOpen(isOpen) {
    this.studioOpen = Boolean(isOpen);
    this.sync();
  }

  sync() {
    if (!this.el) return;
    const state = this.store.getState();

    const btnOrbit = this.el.querySelector('#dock-btn-orbit');
    const btnLock = this.el.querySelector('#dock-btn-lock');
    const btnWarp = this.el.querySelector('#dock-btn-warp');
    const btnAudio = this.el.querySelector('#dock-btn-audio');
    const audioLbl = this.el.querySelector('#dock-audio-label');
    const matLbl = this.el.querySelector('#dock-mat-label');
    const btnReset = this.el.querySelector('#dock-btn-reset-eratis');
    const btnStudio = this.el.querySelector('#dock-btn-studio');

    btnOrbit.classList.toggle('active', Boolean(state.camera.autoOrbit && !state.camera.staticLock));
    btnLock.classList.toggle('active', Boolean(state.camera.staticLock));
    btnWarp.classList.toggle('active', Boolean(state.effects.warpActive));
    btnStudio.classList.toggle('active', this.studioOpen);

    const activeMat = MATERIAL_CATALOG[state.identity.material] || MATERIAL_CATALOG.liquidChrome;
    if (matLbl) {
      const shortNames = {
        liquidChrome: 'CHROME',
        silver: 'SILVER',
        gold24k: '24K GOLD',
        matteMetal: 'MATTE',
        frostedGlass: 'GLASS',
        obsidian: 'OBSIDIAN'
      };
      matLbl.textContent = shortNames[activeMat.id] || 'CHROME';
    }

    btnReset.classList.toggle('hidden', state.identity.mode === 'eratis');

    const hasTracks = this.audioEngine.getPlaylist().length > 0;
    const isPlaying = this.audioEngine.isPlaying;
    btnAudio.classList.toggle('active', isPlaying);
    btnAudio.classList.toggle('playing-eq', isPlaying);
    audioLbl.textContent = !hasTracks ? 'AUDIO' : isPlaying ? 'PAUSE' : 'PLAY';

    if (this._activeKey && this.popoverEl && this.popoverEl.classList.contains('visible')) {
      this._renderPopoverActions(this._activeKey);
    }
  }

  dispose() {
    this._cancelHideTimer();
    for (const fn of this._cleanups) {
      fn();
    }
    this._cleanups = [];
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    if (this.restorePill && this.restorePill.parentNode) {
      this.restorePill.parentNode.removeChild(this.restorePill);
    }
    this.el = null;
    this.restorePill = null;
  }
}
