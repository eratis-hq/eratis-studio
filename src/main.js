import { DEFAULT_STATE } from './core/config.js';
import { Store } from './core/state.js';
import { AudioEngine } from './audio/audioEngine.js';
import { PresetManager } from './presets/presetManager.js';
import { SceneEngine } from './scene/engine.js';
import { ImageLayer } from './scene/imageLayer.js';
import { TextBuilder } from './scene/textBuilder.js';
import { ExportStudio } from './export/exportStudio.js';
import { SignatureIntro } from './ui/signatureIntro.js';
import { ControlDock } from './ui/dock.js';
import { StudioPanel } from './studio/studioPanel.js';

class EratisStudioApp {
  constructor() {
    this.store = new Store(DEFAULT_STATE);
    this.audioEngine = new AudioEngine(this.store);
    this.presetManager = new PresetManager(this.store);

    this.toastStack = document.getElementById('toast-stack');
    this.contextBanner = document.getElementById('context-lost-banner');

    this.presetManager.restoreActiveState();

    const stageEl = document.getElementById('canvas-stage');
    this.sceneEngine = new SceneEngine({
      container: stageEl,
      store: this.store,
      audioEngine: this.audioEngine,
      onNotify: (msg, level) => this.notify(msg, level),
      onContextChange: (lost) => this._handleContextLoss(lost)
    });

    this.signatureIntro = new SignatureIntro({
      onReveal: (immediate) => this.sceneEngine.triggerIntroReveal(immediate),
      onNotify: (msg, level) => this.notify(msg, level)
    });

    this.exportStudio = new ExportStudio({
      sceneEngine: this.sceneEngine,
      presetManager: this.presetManager,
      audioEngine: this.audioEngine,
      onNotify: (msg, level) => this.notify(msg, level)
    });

    this.dock = new ControlDock({
      store: this.store,
      sceneEngine: this.sceneEngine,
      audioEngine: this.audioEngine,
      signatureIntro: this.signatureIntro,
      onToggleStudio: () => this.studioPanel.toggle(),
      onOpenStudioTab: (tab) => {
        this.studioPanel.open();
        this.studioPanel.switchTab(tab);
      },
      onToggleExport: () => this.exportStudio.toggle(),
      onQuickExport: (type) => this.exportStudio.triggerExportAction(type),
      onTriggerAudioLoad: () => {
        const input = document.getElementById('audio-input');
        if (input) input.click();
      },
      onTriggerFontLoad: () => {
        const input = document.getElementById('custom-font-input');
        if (input) input.click();
      },
      onTriggerImageLoad: () => {
        const input = document.getElementById('image-input');
        if (input) input.click();
      },
      onStopRecording: () => this.exportStudio.stopRecording(),
      onNotify: (msg, level) => this.notify(msg, level)
    });

    this.studioPanel = new StudioPanel({
      store: this.store,
      sceneEngine: this.sceneEngine,
      audioEngine: this.audioEngine,
      presetManager: this.presetManager,
      signatureIntro: this.signatureIntro,
      onOpenExport: () => this.exportStudio.open(),
      onNotify: (msg, level) => this.notify(msg, level),
      onOpenChange: (isOpen) => this.dock.setStudioOpen(isOpen)
    });

    this._bindFileInputs();
    this._bindDragAndDrop();
    this._bindKeyboardShortcuts();
    this._bindLifecycleCleanup();

    this.signatureIntro.play();
  }

  notify(message, level = 'info') {
    if (!this.toastStack || !message) return;
    const item = document.createElement('div');
    item.className = `toast-item ${level}`;
    item.textContent = message;
    this.toastStack.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }, 3200);
  }

  _handleContextLoss(isLost) {
    if (!this.contextBanner) return;
    this.contextBanner.classList.toggle('hidden', !isLost);
    if (isLost) {
      this.notify('WebGL context lost — waiting for GPU recovery.', 'warning');
    } else {
      this.notify('WebGL context restored.', 'success');
    }
  }

  _bindFileInputs() {
    const audioInput = document.getElementById('audio-input');
    const imageInput = document.getElementById('image-input');
    const fontInput = document.getElementById('custom-font-input');
    const sigInput = document.getElementById('signature-svg-input');
    const presetInput = document.getElementById('preset-json-input');

    if (audioInput) {
      audioInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          const added = this.audioEngine.addFiles(files, { autoPlayFirst: true });
          if (added.length > 0) {
            this.notify(
              added.length === 1
                ? `Playing "${added[0].name}"`
                : `Added ${added.length} tracks to playlist`,
              'success'
            );
          }
        }
        audioInput.value = '';
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          try {
            const meta = await this.sceneEngine.loadCustomImage(file);
            this.notify(`Loaded image layer: ${meta.fileName}`, 'success');
          } catch (err) {
            this.notify(err.message, 'error');
          }
        }
        imageInput.value = '';
      });
    }

    if (fontInput) {
      fontInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
          try {
            const entry = await this.sceneEngine.loadCustomFont(file);
            this.studioPanel.refreshFontOptions();
            this.studioPanel.syncFromStore();
            this.notify(`Added 3D font: ${entry.label}`, 'success');
          } catch (err) {
            this.notify(`Font error: ${err.message}`, 'error');
          }
        }
        fontInput.value = '';
      });
    }

    if (sigInput) {
      sigInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          try {
            await this.signatureIntro.loadCustomSvgFile(file);
            this.studioPanel.syncAll();
          } catch (err) {
            this.notify(err.message, 'error');
          }
        }
        sigInput.value = '';
      });
    }

    if (presetInput) {
      presetInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          await this._importPresetJsonFile(file);
        }
        presetInput.value = '';
      });
    }
  }

  async _importPresetJsonFile(file) {
    try {
      const text = await file.text();
      const res = this.presetManager.importSceneJSON(text, {
        saveAsCustom: true,
        applyImmediately: true
      });
      if (!res.ok) {
        this.notify(`Preset rejected: ${res.errors.join(' ')}`, 'error');
        return;
      }
      if (res.warnings.length > 0) {
        this.notify(res.warnings[0], 'warning');
      } else {
        this.notify(`Imported preset "${res.preset.name}".`, 'success');
      }
    } catch (err) {
      this.notify(`Failed to import preset JSON: ${err.message}`, 'error');
    }
  }

  _bindDragAndDrop() {
    const dropVeil = document.getElementById('drop-veil');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dropVeil) dropVeil.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (dropVeil) dropVeil.classList.remove('active');
      }
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (dropVeil) dropVeil.classList.remove('active');

      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (files.length === 0) return;

      const audioFiles = files.filter((f) => AudioEngine.isAudioFile(f));
      if (audioFiles.length > 0) {
        const added = this.audioEngine.addFiles(audioFiles, { autoPlayFirst: true });
        this.notify(`Loaded ${added.length} audio track(s).`, 'success');
      }

      const fontFile = files.find((f) => TextBuilder.isSupportedFontFile(f));
      if (fontFile) {
        try {
          const entry = await this.sceneEngine.loadCustomFont(fontFile);
          this.studioPanel.refreshFontOptions();
          this.studioPanel.syncFromStore();
          this.notify(`Loaded custom 3D font: ${entry.label}`, 'success');
        } catch (err) {
          this.notify(`Font error: ${err.message}`, 'error');
        }
      }

      const jsonFile = files.find(
        (f) => !TextBuilder.isSupportedFontFile(f) && (/\.json$/i.test(f.name || '') || f.type === 'application/json')
      );
      if (jsonFile) {
        await this._importPresetJsonFile(jsonFile);
      }

      const imageFile = files.find((f) => ImageLayer.isSupportedImageFile(f));
      if (imageFile) {
        try {
          const meta = await this.sceneEngine.loadCustomImage(imageFile);
          this.notify(`Loaded image layer: ${meta.fileName}`, 'success');
        } catch (err) {
          this.notify(err.message, 'error');
        }
      }
    });
  }

  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.signatureIntro && this.signatureIntro.isActive) {
          e.preventDefault();
          this.signatureIntro.skip();
          return;
        }
        if (this.dock && this.dock.uiHidden) {
          e.preventDefault();
          this.dock.setUiHidden(false);
          return;
        }
        if (this.exportStudio && this.exportStudio.isOpen) {
          e.preventDefault();
          this.exportStudio.close();
          return;
        }
        if (this.studioPanel && this.studioPanel.isOpen) {
          e.preventDefault();
          this.studioPanel.close();
          return;
        }
        return;
      }

      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const isFormInput =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        (document.activeElement && document.activeElement.isContentEditable);

      if (isFormInput) {
        const inputType = document.activeElement.getAttribute('type') || '';
        if (inputType !== 'range' && inputType !== 'checkbox') {
          return;
        }
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.audioEngine.getPlaylist().length > 0) {
          this.audioEngine.togglePlay();
        } else {
          const cur = this.store.getState().effects.warpActive;
          this.store.updateSection('effects', { warpActive: !cur });
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (this.dock.uiHidden) this.dock.setUiHidden(false);
        this.studioPanel.toggle();
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        const cam = this.store.getState().camera;
        const nextOrbit = !cam.autoOrbit;
        this.store.updateSection('camera', {
          autoOrbit: nextOrbit,
          staticLock: nextOrbit ? false : cam.staticLock
        });
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const cam = this.store.getState().camera;
        const nextLock = !cam.staticLock;
        this.store.updateSection('camera', {
          staticLock: nextLock,
          autoOrbit: nextLock ? false : cam.autoOrbit
        });
        this.notify(
          nextLock
            ? 'Static Pose Locked — Sway & cursor drift disabled.'
            : 'Static Pose Unlocked.',
          'info'
        );
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        const cur = this.store.getState().effects.warpActive;
        this.store.updateSection('effects', { warpActive: !cur });
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.dock.toggleUiHidden();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.store.resetAll();
        this.sceneEngine.resetViewOrientation();
        this.presetManager.persistActiveState();
        this.notify('All settings restored to factory ERATIS defaults.', 'success');
      } else if (e.key === 'ArrowLeft') {
        if (this.audioEngine.getPlaylist().length > 0) {
          e.preventDefault();
          this.audioEngine.prevTrack();
        }
      } else if (e.key === 'ArrowRight') {
        if (this.audioEngine.getPlaylist().length > 0) {
          e.preventDefault();
          this.audioEngine.nextTrack(true);
        }
      }
    });
  }

  _bindLifecycleCleanup() {
    window.addEventListener('beforeunload', () => {
      this.presetManager.persistActiveState();
      this.exportStudio.dispose();
      this.studioPanel.dispose();
      this.dock.dispose();
      this.signatureIntro.dispose();
      this.audioEngine.dispose();
      this.sceneEngine.dispose();
    });
  }
}

function bootEratisStudio() {
  if (window.__ERATIS_STUDIO__) return;
  window.__ERATIS_STUDIO__ = new EratisStudioApp();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootEratisStudio);
} else {
  bootEratisStudio();
}
