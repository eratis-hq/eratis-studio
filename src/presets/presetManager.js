import {
  APP_INFO,
  BUILTIN_PRESETS,
  DEFAULT_STATE,
  FONT_IDS,
  IDENTITY_MODES,
  MATERIAL_IDS,
  REPEAT_MODES,
  STORAGE_KEYS
} from '../core/config.js';
import { deepClone, deepMerge } from '../core/state.js';

function clampNum(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isValidHexColor(str) {
  return typeof str === 'string' && /^#[0-9a-fA-F]{6}$/.test(str.trim());
}

export function stripLocalMediaForExport(stateSnapshot) {
  const clean = deepMerge(DEFAULT_STATE, stateSnapshot);
  const excluded = [];

  if (clean.identity.mode === 'image' || clean.identity.image.fileName) {
    excluded.push('local-image-file');
  }
  clean.identity.image = {
    opacity: clampNum(clean.identity.image.opacity, 0.05, 1.0, 1.0),
    scale: clampNum(clean.identity.image.scale, 0.2, 3.0, 1.0),
    fileName: ''
  };

  delete clean.audio.playlist;
  delete clean.audio.blobUrl;
  delete clean.identity.image.blobUrl;
  delete clean.identity.image.dataUrl;

  return {
    state: clean,
    localMediaExcluded: true,
    excludedTypes: excluded,
    privacyNote:
      'Local audio files, custom image uploads, and custom SVG signature files are intentionally excluded from JSON exports for user privacy.'
  };
}

export function validatePresetPayload(payload) {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['JSON root must be an object.'], warnings, sanitized: null };
  }

  if (payload.app && payload.app !== 'eratis-studio') {
    errors.push(`Unsupported application identifier: "${String(payload.app)}".`);
  }

  if (payload.schemaVersion && typeof payload.schemaVersion !== 'string') {
    errors.push('schemaVersion must be a semver string.');
  }

  const rawState = payload.state && typeof payload.state === 'object' ? payload.state : null;
  if (!rawState) {
    errors.push('Missing required "state" object.');
    return { valid: false, errors, warnings, sanitized: null };
  }

  const serializedCheck = JSON.stringify(rawState);
  if (/data:(image|audio)\//i.test(serializedCheck) || /blob:http/i.test(serializedCheck)) {
    warnings.push('Local media data/blob URLs detected in JSON were stripped for privacy and portability.');
  }

  const sanitized = deepClone(DEFAULT_STATE);

  if (rawState.identity && typeof rawState.identity === 'object') {
    const id = rawState.identity;
    if (id.mode !== undefined) {
      if (IDENTITY_MODES.includes(id.mode)) {
        sanitized.identity.mode = id.mode;
      } else {
        errors.push(`Invalid identity.mode "${String(id.mode)}". Allowed: ${IDENTITY_MODES.join(', ')}.`);
      }
    }
    if (id.material !== undefined) {
      if (MATERIAL_IDS.includes(id.material)) {
        sanitized.identity.material = id.material;
      } else {
        errors.push(`Invalid identity.material "${String(id.material)}".`);
      }
    }
    if (id.showOrbits !== undefined) sanitized.identity.showOrbits = Boolean(id.showOrbits);
    sanitized.identity.positionX = clampNum(id.positionX, -10, 10, DEFAULT_STATE.identity.positionX);
    sanitized.identity.positionY = clampNum(id.positionY, -8, 8, DEFAULT_STATE.identity.positionY);
    sanitized.identity.scale = clampNum(id.scale, 0.25, 2.5, DEFAULT_STATE.identity.scale);
    sanitized.identity.rotationX = clampNum(id.rotationX, -180, 180, DEFAULT_STATE.identity.rotationX);
    sanitized.identity.rotationY = clampNum(id.rotationY, -180, 180, DEFAULT_STATE.identity.rotationY);
    sanitized.identity.rotationZ = clampNum(id.rotationZ, -180, 180, DEFAULT_STATE.identity.rotationZ);

    if (id.text && typeof id.text === 'object') {
      const t = id.text;
      sanitized.identity.text.value =
        typeof t.value === 'string' && t.value.trim().length > 0
          ? t.value.slice(0, 48)
          : DEFAULT_STATE.identity.text.value;
      if (t.font !== undefined) {
        if (FONT_IDS.includes(t.font) || (typeof t.font === 'string' && t.font.startsWith('custom_font_'))) {
          sanitized.identity.text.font = t.font;
        } else {
          warnings.push(`Unknown font "${String(t.font)}", reverted to default.`);
        }
      }
      sanitized.identity.text.letterSpacing = clampNum(t.letterSpacing, -0.2, 1.2, DEFAULT_STATE.identity.text.letterSpacing);
      sanitized.identity.text.italicSlant = clampNum(t.italicSlant, -0.6, 0.8, DEFAULT_STATE.identity.text.italicSlant);
      sanitized.identity.text.depth = clampNum(t.depth, 0.05, 2.5, DEFAULT_STATE.identity.text.depth);
      sanitized.identity.text.bevelSize = clampNum(t.bevelSize, 0, 0.35, DEFAULT_STATE.identity.text.bevelSize);
      sanitized.identity.text.bevelThickness = clampNum(t.bevelThickness, 0, 0.45, DEFAULT_STATE.identity.text.bevelThickness);
    }

    if (id.image && typeof id.image === 'object') {
      sanitized.identity.image.opacity = clampNum(id.image.opacity, 0.05, 1.0, 1.0);
      sanitized.identity.image.scale = clampNum(id.image.scale, 0.2, 3.0, 1.0);
      sanitized.identity.image.fileName = '';
    }

    if (sanitized.identity.mode === 'image') {
      warnings.push('Imported preset uses "image" mode. Local images are not embedded in JSON — upload an image or switch to ERATIS/Text.');
    }
  }

  if (rawState.environment && typeof rawState.environment === 'object') {
    const env = rawState.environment;
    if (env.backgroundColor !== undefined) {
      if (isValidHexColor(env.backgroundColor)) {
        sanitized.environment.backgroundColor = env.backgroundColor.trim();
      } else {
        errors.push(`Invalid environment.backgroundColor "${String(env.backgroundColor)}". Expected #RRGGBB.`);
      }
    }
    sanitized.environment.fogDensity = clampNum(env.fogDensity, 0, 0.04, DEFAULT_STATE.environment.fogDensity);
    sanitized.environment.exposure = clampNum(env.exposure, 0.4, 3.0, DEFAULT_STATE.environment.exposure);
    sanitized.environment.reflectionIntensity = clampNum(env.reflectionIntensity, 0.1, 2.5, DEFAULT_STATE.environment.reflectionIntensity);
    sanitized.environment.keyLightIntensity = clampNum(env.keyLightIntensity, 0, 6.0, DEFAULT_STATE.environment.keyLightIntensity);
    sanitized.environment.rimLightIntensity = clampNum(env.rimLightIntensity, 0, 6.0, DEFAULT_STATE.environment.rimLightIntensity);
    sanitized.environment.cursorLightIntensity = clampNum(env.cursorLightIntensity, 0, 6.0, DEFAULT_STATE.environment.cursorLightIntensity);
    if (env.starfieldEnabled !== undefined) sanitized.environment.starfieldEnabled = Boolean(env.starfieldEnabled);
    sanitized.environment.starCount = Math.round(clampNum(env.starCount, 200, 5000, DEFAULT_STATE.environment.starCount));
    sanitized.environment.starSpeed = clampNum(env.starSpeed, 0.1, 4.0, DEFAULT_STATE.environment.starSpeed);
    sanitized.environment.starSize = clampNum(env.starSize, 0.08, 0.8, DEFAULT_STATE.environment.starSize);
    sanitized.environment.starBrightness = clampNum(env.starBrightness, 0.1, 1.0, DEFAULT_STATE.environment.starBrightness);
  }

  if (rawState.audio && typeof rawState.audio === 'object') {
    const a = rawState.audio;
    if (a.reactive !== undefined) sanitized.audio.reactive = Boolean(a.reactive);
    sanitized.audio.bassSensitivity = clampNum(a.bassSensitivity, 0, 2.5, DEFAULT_STATE.audio.bassSensitivity);
    sanitized.audio.midTrebleSensitivity = clampNum(a.midTrebleSensitivity, 0, 2.5, DEFAULT_STATE.audio.midTrebleSensitivity);
    sanitized.audio.volume = clampNum(a.volume, 0, 1, DEFAULT_STATE.audio.volume);
    if (a.muted !== undefined) sanitized.audio.muted = Boolean(a.muted);
    if (a.shuffle !== undefined) sanitized.audio.shuffle = Boolean(a.shuffle);
    if (a.repeat !== undefined) {
      if (REPEAT_MODES.includes(a.repeat)) {
        sanitized.audio.repeat = a.repeat;
      } else {
        errors.push(`Invalid audio.repeat "${String(a.repeat)}".`);
      }
    }
  }

  if (rawState.camera && typeof rawState.camera === 'object') {
    const c = rawState.camera;
    sanitized.camera.distance = clampNum(c.distance, 11, 42, DEFAULT_STATE.camera.distance);
    sanitized.camera.fov = clampNum(c.fov, 22, 75, DEFAULT_STATE.camera.fov);
    if (c.autoOrbit !== undefined) sanitized.camera.autoOrbit = Boolean(c.autoOrbit);
    sanitized.camera.orbitSpeed = clampNum(c.orbitSpeed, 0.05, 2.5, DEFAULT_STATE.camera.orbitSpeed);
    sanitized.camera.parallaxStrength = clampNum(c.parallaxStrength, 0, 2.5, DEFAULT_STATE.camera.parallaxStrength);
    if (c.idleSway !== undefined) sanitized.camera.idleSway = Boolean(c.idleSway);
    if (c.staticLock !== undefined) sanitized.camera.staticLock = Boolean(c.staticLock);
  }

  if (rawState.effects && typeof rawState.effects === 'object') {
    const ef = rawState.effects;
    if (ef.warpActive !== undefined) sanitized.effects.warpActive = Boolean(ef.warpActive);
    sanitized.effects.warpIntensity = clampNum(ef.warpIntensity, 0.2, 2.5, DEFAULT_STATE.effects.warpIntensity);
    if (ef.lensFlares !== undefined) sanitized.effects.lensFlares = Boolean(ef.lensFlares);
    sanitized.effects.flareIntensity = clampNum(ef.flareIntensity, 0, 2.5, DEFAULT_STATE.effects.flareIntensity);
    sanitized.effects.vignetteStrength = clampNum(ef.vignetteStrength, 0, 1.0, DEFAULT_STATE.effects.vignetteStrength);
  }

  const name =
    typeof payload.name === 'string' && payload.name.trim().length > 0
      ? payload.name.trim().slice(0, 60)
      : 'Imported ERATIS Preset';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized: errors.length === 0 ? { name, state: sanitized } : null
  };
}

export class PresetManager {
  constructor(store, storage = null) {
    this.store = store;
    this.storage = storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.customPresets = this._loadCustomPresets();
    this.activePresetId = BUILTIN_PRESETS[0].id;
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    const all = this.listPresets();
    for (const listener of this._listeners) {
      listener(all, this.activePresetId);
    }
  }

  _loadCustomPresets() {
    if (!this.storage) return [];
    try {
      const raw = this.storage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const validList = [];
      for (const item of parsed) {
        const res = validatePresetPayload(item);
        if (res.valid && res.sanitized) {
          validList.push({
            id: typeof item.id === 'string' && item.id ? item.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: res.sanitized.name,
            builtin: false,
            createdAt: item.createdAt || new Date().toISOString(),
            state: res.sanitized.state
          });
        }
      }
      return validList;
    } catch (_) {
      return [];
    }
  }

  _persistCustomPresets() {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(this.customPresets));
    } catch (_) {

    }
  }

  persistActiveState() {
    if (!this.storage || !this.store) return;
    try {
      const stripped = stripLocalMediaForExport(this.store.getSnapshot());
      this.storage.setItem(STORAGE_KEYS.ACTIVE_STATE, JSON.stringify(stripped.state));
    } catch (_) {

    }
  }

  restoreActiveState() {
    if (!this.storage || !this.store) return false;
    try {
      const raw = this.storage.getItem(STORAGE_KEYS.ACTIVE_STATE);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const res = validatePresetPayload({ app: 'eratis-studio', schemaVersion: APP_INFO.schemaVersion, state: parsed });
      if (res.valid && res.sanitized) {

        if (res.sanitized.state.identity.mode === 'image') {
          res.sanitized.state.identity.mode = 'eratis';
        }
        this.store.replaceState(res.sanitized.state, 'all');
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  listPresets() {
    return [
      ...BUILTIN_PRESETS.map((p) => ({ ...p, state: deepClone(p.state) })),
      ...this.customPresets.map((p) => ({ ...p, state: deepClone(p.state) }))
    ];
  }

  getPresetById(id) {
    return this.listPresets().find((p) => p.id === id) || null;
  }

  applyPreset(id) {
    const preset = this.getPresetById(id);
    if (!preset) return null;
    this.activePresetId = preset.id;
    this.store.replaceState(preset.state, 'all');
    this.persistActiveState();
    this._notify();
    return preset;
  }

  saveCustomPreset(name) {
    const cleanName = (name || '').trim().slice(0, 60);
    if (!cleanName) {
      throw new Error('Preset name cannot be empty.');
    }

    const stripped = stripLocalMediaForExport(this.store.getSnapshot());
    const existing = this.customPresets.find((p) => p.name.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      existing.name = cleanName;
      existing.state = stripped.state;
      existing.updatedAt = new Date().toISOString();
      this.activePresetId = existing.id;
      this._persistCustomPresets();
      this._notify();
      return { preset: deepClone(existing), updated: true, privacyNote: stripped.privacyNote };
    }

    const preset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      builtin: false,
      createdAt: new Date().toISOString(),
      state: stripped.state
    };
    this.customPresets.push(preset);
    this.activePresetId = preset.id;
    this._persistCustomPresets();
    this._notify();
    return { preset: deepClone(preset), updated: false, privacyNote: stripped.privacyNote };
  }

  deleteCustomPreset(id) {
    const idx = this.customPresets.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.customPresets.splice(idx, 1);
    if (this.activePresetId === id) {
      this.activePresetId = BUILTIN_PRESETS[0].id;
    }
    this._persistCustomPresets();
    this._notify();
    return true;
  }

  exportSceneJSON(presetName = 'ERATIS Scene') {
    const stripped = stripLocalMediaForExport(this.store.getSnapshot());
    const payload = {
      app: 'eratis-studio',
      schemaVersion: APP_INFO.schemaVersion,
      name: (presetName || 'ERATIS Scene').trim().slice(0, 60),
      exportedAt: new Date().toISOString(),
      metadata: {
        localMediaExcluded: stripped.localMediaExcluded,
        excludedTypes: stripped.excludedTypes,
        privacyNote: stripped.privacyNote
      },
      state: stripped.state
    };
    return {
      payload,
      json: JSON.stringify(payload, null, 2)
    };
  }

  importSceneJSON(jsonText, { saveAsCustom = true, applyImmediately = true } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return {
        ok: false,
        errors: [`Invalid JSON syntax: ${err.message}`],
        warnings: []
      };
    }

    const validation = validatePresetPayload(parsed);
    if (!validation.valid || !validation.sanitized) {
      return {
        ok: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    const { name, state } = validation.sanitized;

    if (applyImmediately) {

      const nextState = deepClone(state);
      this.store.replaceState(nextState, 'all');
      this.persistActiveState();
    }

    let savedPreset = null;
    if (saveAsCustom) {
      const preset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        builtin: false,
        createdAt: new Date().toISOString(),
        state
      };
      this.customPresets.push(preset);
      this.activePresetId = preset.id;
      this._persistCustomPresets();
      this._notify();
      savedPreset = deepClone(preset);
    }

    return {
      ok: true,
      preset: savedPreset,
      state,
      errors: [],
      warnings: validation.warnings
    };
  }
}
