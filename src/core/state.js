import { DEFAULT_STATE } from './config.js';

export function deepClone(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const cloned = {};
  for (const key of Object.keys(value)) {
    cloned[key] = deepClone(value[key]);
  }
  return cloned;
}

export function deepMerge(target, source) {
  if (!source || typeof source !== 'object') {
    return deepClone(target);
  }
  const output = deepClone(target);
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      output[key] !== null &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key], srcVal);
    } else if (srcVal !== undefined) {
      output[key] = deepClone(srcVal);
    }
  }
  return output;
}

export class Store {
  constructor(initialState = DEFAULT_STATE) {
    this._state = deepMerge(DEFAULT_STATE, initialState);
    this._listeners = new Set();
  }

  getState() {
    return this._state;
  }

  getSnapshot() {
    return deepClone(this._state);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Store subscriber must be a function');
    }
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _notify(changedSection = 'all') {
    for (const listener of this._listeners) {
      listener(this._state, changedSection);
    }
  }

  setState(partial, sectionTag = 'all') {
    this._state = deepMerge(this._state, partial);
    this._notify(sectionTag);
  }

  replaceState(nextState, sectionTag = 'all') {
    this._state = deepMerge(DEFAULT_STATE, nextState);
    this._notify(sectionTag);
  }

  updateSection(section, partial) {
    if (!Object.prototype.hasOwnProperty.call(this._state, section)) {
      throw new Error(`Unknown state section: ${section}`);
    }
    this._state = {
      ...this._state,
      [section]: deepMerge(this._state[section], partial)
    };
    this._notify(section);
  }

  resetIdentityToEratis() {
    this.updateSection('identity', {
      mode: 'eratis',
      showOrbits: true,
      positionX: 0,
      positionY: 0,
      scale: 1.0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0
    });
  }

  resetCamera() {
    this.updateSection('camera', {
      distance: DEFAULT_STATE.camera.distance,
      fov: DEFAULT_STATE.camera.fov,
      autoOrbit: false,
      orbitSpeed: DEFAULT_STATE.camera.orbitSpeed,
      parallaxStrength: DEFAULT_STATE.camera.parallaxStrength,
      idleSway: true,
      staticLock: false
    });
  }

  resetAll() {
    this._state = deepClone(DEFAULT_STATE);
    this._notify('all');
  }
}
