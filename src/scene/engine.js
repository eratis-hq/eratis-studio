import { APP_INFO } from '../core/config.js';
import {
  MaterialManager,
  createStarburstTexture,
  createBacklightHaloTexture
} from './materials.js';
import {
  createEratisLetters,
  createOrbitalSwooshes,
  createOrbitalFlares,
  disposeObject3D
} from './eratisLogo.js';
import { TextBuilder } from './textBuilder.js';
import { ImageLayer } from './imageLayer.js';
import { Starfield } from './starfield.js';

function getTHREE() {
  if (!window.THREE) {
    throw new Error('Three.js r128 must be loaded before initializing SceneEngine.');
  }
  return window.THREE;
}

export class SceneEngine {
  constructor({ container, store, audioEngine, onNotify, onContextChange }) {
    this.container = container;
    this.store = store;
    this.audioEngine = audioEngine;
    this.onNotify = onNotify || (() => {});
    this.onContextChange = onContextChange || (() => {});

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.materialManager = null;
    this.textBuilder = null;
    this.imageLayer = null;
    this.starfield = null;

    this.emblemGroup = null;
    this.transformGroup = null;
    this.eratisGroup = null;
    this.swooshGroup = null;
    this.flareData = null;

    this.lights = {
      ambient: null,
      key: null,
      rim: null,
      cursor: null,
      fill: null
    };

    this.interactiveMeshes = [];
    this.raycaster = null;
    this.pointerNDC = null;

    this.isDragging = false;
    this.dragDistance = 0;
    this.prevPointer = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.dragVelocity = { x: 0, y: 0 };
    this.pointerNorm = { x: 0, y: 0 };
    this.smoothPointer = { x: 0, y: 0 };
    this.isHoveringLogo = false;

    this.orbitAngle = 0;
    this.warpFactor = 0;
    this.revealProgress = 0;
    this.revealActive = false;
    this.currentZoomZ = 31.0;

    this.reactive = {
      bass: 0,
      mid: 0,
      treble: 0
    };

    this._lastTextSignature = '';
    this._textDebounceTimer = null;
    this._textReportListeners = new Set();

    this._rafId = null;
    this._lastTime = performance.now();
    this._contextLost = false;
    this._disposed = false;
    this._cleanups = [];

    this._init();
  }

  _init() {
    const THREE = getTHREE();
    const state = this.store.getState();

    this.raycaster = new THREE.Raycaster();
    this.pointerNDC = new THREE.Vector2();

    const bgColor = new THREE.Color(state.environment.backgroundColor || '#000000');
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(bgColor.getHex(), state.environment.fogDensity);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(state.camera.fov, width / height, 0.1, 260);
    this.currentZoomZ = state.camera.distance + 5.5;
    this.camera.position.set(0, 0, this.currentZoomZ);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(bgColor, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = state.environment.exposure;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    this.materialManager = new MaterialManager();
    this.scene.environment = this.materialManager.getEnvMap();
    const activeMat = this.materialManager.getMaterial(state.identity.material);

    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.42);
    this.scene.add(this.lights.ambient);

    this.lights.key = new THREE.DirectionalLight(0xffffff, state.environment.keyLightIntensity);
    this.lights.key.position.set(8, 12, 16);
    this.scene.add(this.lights.key);

    this.lights.rim = new THREE.DirectionalLight(0xe6e8ec, state.environment.rimLightIntensity);
    this.lights.rim.position.set(-10, -8, 14);
    this.scene.add(this.lights.rim);

    this.lights.cursor = new THREE.PointLight(0xffffff, state.environment.cursorLightIntensity, 58);
    this.lights.cursor.position.set(0, 3, 15);
    this.scene.add(this.lights.cursor);

    this.lights.fill = new THREE.PointLight(0xd1d5db, 1.65, 55);
    this.lights.fill.position.set(6, -4, 14);
    this.scene.add(this.lights.fill);

    this.emblemGroup = new THREE.Group();
    this.emblemGroup.name = 'eratis-emblem-root';
    this.scene.add(this.emblemGroup);

    this.transformGroup = new THREE.Group();
    this.transformGroup.name = 'eratis-user-transform';
    this.emblemGroup.add(this.transformGroup);

    this.eratisGroup = createEratisLetters(activeMat);
    this.transformGroup.add(this.eratisGroup);

    this.textBuilder = new TextBuilder();
    this.textBuilder.getGroup().visible = false;
    this.transformGroup.add(this.textBuilder.getGroup());

    this.imageLayer = new ImageLayer();
    this.imageLayer.getGroup().visible = false;
    this.transformGroup.add(this.imageLayer.getGroup());

    this.swooshGroup = createOrbitalSwooshes(activeMat);
    this.transformGroup.add(this.swooshGroup);

    const flareTexture = createStarburstTexture();
    this.flareData = createOrbitalFlares(flareTexture);
    this.swooshGroup.add(this.flareData.group);

    this.backlightTexture = createBacklightHaloTexture();
    const backlightMat = new THREE.SpriteMaterial({
      map: this.backlightTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.backlightSprite = new THREE.Sprite(backlightMat);
    this.backlightSprite.position.set(0, 0, -2.6);
    this.backlightSprite.scale.set(16.5, 9.2, 1);
    this.scene.add(this.backlightSprite);

    this.starfield = new Starfield(this.scene, state.environment.starCount);

    this.emblemGroup.scale.setScalar(0.84);
    this.revealProgress = 0;

    this._bindEvents();
    this._syncFromState(state, 'all');

    const unsubscribe = this.store.subscribe((nextState, section) => {
      this._syncFromState(nextState, section);
    });
    this._cleanups.push(unsubscribe);

    this._lastTime = performance.now();
    this._startLoop();
  }

  getCanvas() {
    return this.renderer ? this.renderer.domElement : null;
  }

  triggerIntroReveal(immediate = false) {
    this.revealActive = true;
    if (immediate) {
      this.revealProgress = 1;
      this.emblemGroup.scale.setScalar(1);
      this.currentZoomZ = this.store.getState().camera.distance;
    } else {
      this.revealProgress = 0;
      this.emblemGroup.scale.setScalar(0.84);
      this.currentZoomZ = this.store.getState().camera.distance + 5.5;
    }
  }

  resetViewOrientation() {
    this.dragOffset.x = 0;
    this.dragOffset.y = 0;
    this.dragVelocity.x = 0;
    this.dragVelocity.y = 0;
    this.orbitAngle = 0;
    this.store.updateSection('camera', { distance: 25.5 });
  }

  async loadCustomImage(file) {
    const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 4;
    const meta = await this.imageLayer.loadFile(file, maxAniso);
    this.store.updateSection('identity', {
      mode: 'image',
      image: { fileName: meta.fileName }
    });
    this._refreshInteractiveMeshes();
    return meta;
  }

  async loadCustomFont(file) {
    const entry = await this.textBuilder.loadCustomFontFile(file);
    this.store.updateSection('identity', {
      mode: 'text',
      text: { font: entry.id }
    });
    return entry;
  }

  deleteFont(fontId) {
    if (!this.textBuilder) return null;
    const res = this.textBuilder.deleteFont(fontId);
    const curFont = this.store.getState().identity.text.font;
    if (curFont === fontId && res.nextFontId) {
      this.store.updateSection('identity', {
        text: { font: res.nextFontId }
      });
    }
    return res;
  }

  restoreDefaultFonts() {
    if (!this.textBuilder) return [];
    return this.textBuilder.restoreDefaultFonts();
  }

  getAvailableFonts() {
    return this.textBuilder ? this.textBuilder.getAvailableFonts() : [];
  }

  clearCustomImage() {
    this.imageLayer.clear();
    this.store.updateSection('identity', {
      image: { fileName: '' }
    });
    if (this.store.getState().identity.mode === 'image') {
      this.store.resetIdentityToEratis();
    }
    this._refreshInteractiveMeshes();
  }

  hasCustomImage() {
    return this.imageLayer ? this.imageLayer.hasImage() : false;
  }

  _applyStudioMaterial(materialId) {
    const mat = this.materialManager.getMaterial(materialId);
    const apply = (group) => {
      if (!group) return;
      group.traverse((obj) => {
        if (obj.isMesh && obj.userData.isStudioMaterialTarget) {
          obj.material = mat;
        }
      });
    };
    apply(this.eratisGroup);
    apply(this.swooshGroup);
    this.textBuilder.applyMaterial(mat);
  }

  _syncFromState(state, section) {
    const THREE = getTHREE();
    const { identity, environment, camera, effects } = state;

    if (section === 'all' || section === 'identity') {
      this._applyStudioMaterial(identity.material);

      this.eratisGroup.visible = identity.mode === 'eratis';
      this.textBuilder.getGroup().visible = identity.mode === 'text';
      this.imageLayer.getGroup().visible = identity.mode === 'image';
      this.swooshGroup.visible = Boolean(identity.showOrbits);

      this.transformGroup.position.set(identity.positionX, identity.positionY, 0);
      this.transformGroup.scale.setScalar(identity.scale);
      this.transformGroup.rotation.set(
        THREE.MathUtils.degToRad(identity.rotationX),
        THREE.MathUtils.degToRad(identity.rotationY),
        THREE.MathUtils.degToRad(identity.rotationZ)
      );

      this.imageLayer.setOpacity(identity.image.opacity);
      this.imageLayer.setLayerScale(identity.image.scale);

      if (identity.mode === 'text') {
        const sig = JSON.stringify(identity.text);
        if (sig !== this._lastTextSignature) {
          this._lastTextSignature = sig;
          this._scheduleTextRebuild(identity.text);
        }
      }

      this._refreshInteractiveMeshes();
    }

    if (section === 'all' || section === 'environment') {
      const bg = new THREE.Color(environment.backgroundColor || '#000000');
      this.renderer.setClearColor(bg, 1);
      if (this.scene.fog) {
        this.scene.fog.color.copy(bg);
        this.scene.fog.density = environment.fogDensity;
      }
      this.renderer.toneMappingExposure = environment.exposure;
      this.starfield.setVisible(environment.starfieldEnabled);
      this.starfield.setCount(environment.starCount);
    }

    if (section === 'all' || section === 'camera') {
      if (this.camera && Math.abs(this.camera.fov - camera.fov) > 0.01) {
        this.camera.fov = camera.fov;
        this.camera.updateProjectionMatrix();
      }
    }

    if (section === 'all' || section === 'effects' || section === 'identity') {
      if (this.flareData && this.flareData.group) {
        this.flareData.group.visible = Boolean(effects.lensFlares && identity.showOrbits);
      }
      document.documentElement.style.setProperty(
        '--vignette-opacity',
        String(Math.max(0, Math.min(1, effects.vignetteStrength)))
      );
    }
  }

  onTextBuildReport(listener) {
    if (typeof listener !== 'function') return () => {};
    this._textReportListeners.add(listener);
    if (this.textBuilder) {
      listener(this.textBuilder.getLastBuildReport());
    }
    return () => this._textReportListeners.delete(listener);
  }

  _scheduleTextRebuild(textConfig) {
    if (this._textDebounceTimer) {
      clearTimeout(this._textDebounceTimer);
    }
    this._textDebounceTimer = setTimeout(async () => {
      this._textDebounceTimer = null;
      const activeMat = this.materialManager.getActiveMaterial();
      const built = await this.textBuilder.build(textConfig, activeMat, (msg, level = 'warning') => {
        this.onNotify(msg, level);
      });
      if (built) {
        this._refreshInteractiveMeshes();
        const report = this.textBuilder.getLastBuildReport();
        for (const listener of this._textReportListeners) {
          try {
            listener(report);
          } catch (_) {}
        }
      }
    }, 65);
  }

  _refreshInteractiveMeshes() {
    this.interactiveMeshes = [];
    const mode = this.store.getState().identity.mode;
    const primaryTarget =
      mode === 'text'
        ? this.textBuilder.getGroup()
        : mode === 'image'
          ? this.imageLayer.getGroup()
          : this.eratisGroup;

    if (primaryTarget) {
      primaryTarget.traverse((obj) => {
        if (obj.isMesh) this.interactiveMeshes.push(obj);
      });
    }
    if (this.swooshGroup && this.swooshGroup.visible) {
      this.swooshGroup.traverse((obj) => {
        if (obj.isMesh) this.interactiveMeshes.push(obj);
      });
    }
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragDistance = 0;
      this.prevPointer.x = e.clientX;
      this.prevPointer.y = e.clientY;
      this.dragVelocity.x = 0;
      this.dragVelocity.y = 0;
    };

    const onPointerMove = (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerNorm.x = this.pointerNDC.x;
      this.pointerNorm.y = this.pointerNDC.y;

      if (!this.isDragging) {
        if (this.interactiveMeshes.length > 0 && e.target === dom) {
          this.raycaster.setFromCamera(this.pointerNDC, this.camera);
          const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
          this.isHoveringLogo = hits.length > 0;
          this.container.style.cursor = this.isHoveringLogo ? 'pointer' : 'grab';
        }
        return;
      }

      const dx = e.clientX - this.prevPointer.x;
      const dy = e.clientY - this.prevPointer.y;
      this.dragDistance += Math.hypot(dx, dy);

      this.dragVelocity.y = dx * 0.0068;
      this.dragVelocity.x = dy * 0.0055;

      this.dragOffset.y += this.dragVelocity.y;
      this.dragOffset.x = Math.max(-0.95, Math.min(0.95, this.dragOffset.x + this.dragVelocity.x));

      this.prevPointer.x = e.clientX;
      this.prevPointer.y = e.clientY;
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.container.style.cursor = this.isHoveringLogo ? 'pointer' : 'grab';

      if (this.dragDistance < 6 && e.target === dom && this.store.getState().identity.mode === 'eratis') {
        const rect = dom.getBoundingClientRect();
        this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
        if (hits.length > 0) {
          window.open(APP_INFO.githubUrl, '_blank', 'noopener,noreferrer');
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const currentDist = this.store.getState().camera.distance;
      const nextDist = Math.max(11, Math.min(42, Number((currentDist + e.deltaY * 0.012).toFixed(2))));
      this.store.updateSection('camera', { distance: nextDist });
    };

    const onDoubleClick = () => {
      this.resetViewOrientation();
    };

    const onResize = () => {
      if (!this.renderer || !this.camera) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    const onContextLost = (e) => {
      e.preventDefault();
      this._contextLost = true;
      this._stopLoop();
      this.onContextChange(true);
    };

    const onContextRestored = () => {
      this._contextLost = false;
      this._lastTime = performance.now();
      this._syncFromState(this.store.getState(), 'all');
      this.onContextChange(false);
      this._startLoop();
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('resize', onResize);
    dom.addEventListener('webglcontextlost', onContextLost, false);
    dom.addEventListener('webglcontextrestored', onContextRestored, false);

    this._cleanups.push(() => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('webglcontextlost', onContextLost);
      dom.removeEventListener('webglcontextrestored', onContextRestored);
    });
  }

  _startLoop() {
    if (this._rafId !== null || this._disposed || this._contextLost) return;
    const tick = () => {
      if (this._disposed || this._contextLost) return;
      this._rafId = requestAnimationFrame(tick);
      this._renderFrame();
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _renderFrame() {
    const now = performance.now();
    const dt = Math.min(Math.max((now - this._lastTime) * 0.001, 0.0001), 0.05);
    this._lastTime = now;
    const t = now * 0.001;

    const state = this.store.getState();
    const { environment, audio, camera: camCfg, effects } = state;

    const levels = this.audioEngine ? this.audioEngine.sample(dt) : { bass: 0, mid: 0, treble: 0 };
    const reactiveEnabled = Boolean(audio.reactive);
    const targetBass = reactiveEnabled ? levels.bass * audio.bassSensitivity : 0;
    const targetMid = reactiveEnabled ? levels.mid * audio.midTrebleSensitivity : 0;
    const targetTreble = reactiveEnabled ? levels.treble * audio.midTrebleSensitivity : 0;

    const reactLerp = 1 - Math.exp(-9.0 * dt);
    this.reactive.bass += (targetBass - this.reactive.bass) * reactLerp;
    this.reactive.mid += (targetMid - this.reactive.mid) * reactLerp;
    this.reactive.treble += (targetTreble - this.reactive.treble) * reactLerp;

    if (this.revealActive && this.revealProgress < 1) {
      this.revealProgress = Math.min(1, this.revealProgress + dt * 1.15);
      const easeOutCubic = 1 - Math.pow(1 - this.revealProgress, 3);
      this.emblemGroup.scale.setScalar(0.84 + 0.16 * easeOutCubic);
    }

    const pLerp = 1 - Math.exp(-5.5 * dt);
    this.smoothPointer.x += (this.pointerNorm.x - this.smoothPointer.x) * pLerp;
    this.smoothPointer.y += (this.pointerNorm.y - this.smoothPointer.y) * pLerp;

    const targetWarp = effects.warpActive ? effects.warpIntensity : 0;
    this.warpFactor += (targetWarp - this.warpFactor) * (1 - Math.exp(-4.5 * dt));

    const isLocked = Boolean(camCfg.staticLock);
    const activeParallax = isLocked ? 0 : camCfg.parallaxStrength;
    const effectiveZoomZ = camCfg.distance + this.warpFactor * 2.4;
    this.currentZoomZ += (effectiveZoomZ - this.currentZoomZ) * (1 - Math.exp(-5.0 * dt));
    this.camera.position.z = this.currentZoomZ;
    const targetCamX = this.smoothPointer.x * 0.65 * activeParallax;
    const targetCamY = this.smoothPointer.y * 0.45 * activeParallax;
    this.camera.position.x += (targetCamX - this.camera.position.x) * (1 - Math.exp(-8.0 * dt));
    this.camera.position.y += (targetCamY - this.camera.position.y) * (1 - Math.exp(-8.0 * dt));
    this.camera.lookAt(0, 0, 0);

    const midTrebleEnergy = this.reactive.mid * 0.55 + this.reactive.treble * 0.75;
    if (this.lights.cursor) {
      this.lights.cursor.position.x = this.smoothPointer.x * 11;
      this.lights.cursor.position.y = this.smoothPointer.y * 7 + 2;
      this.lights.cursor.intensity = environment.cursorLightIntensity * (1 + midTrebleEnergy * 0.7);
    }
    if (this.lights.key) {
      this.lights.key.intensity = environment.keyLightIntensity * (1 + this.reactive.mid * 0.35);
    }
    if (this.lights.rim) {
      this.lights.rim.intensity = environment.rimLightIntensity * (1 + this.reactive.treble * 0.55);
    }

    if (!this.isDragging) {
      this.dragOffset.y += this.dragVelocity.y;
      this.dragOffset.x += this.dragVelocity.x;
      this.dragVelocity.x *= Math.pow(0.06, dt);
      this.dragVelocity.y *= Math.pow(0.06, dt);
      this.dragOffset.x *= Math.pow(isLocked ? 0.04 : 0.25, dt);
      if (!camCfg.autoOrbit || isLocked) {
        this.dragOffset.y *= Math.pow(isLocked ? 0.04 : 0.45, dt);
      }
    }

    if (camCfg.autoOrbit && !isLocked && !this.isDragging) {
      this.orbitAngle += dt * (camCfg.orbitSpeed + this.warpFactor * 0.95);
    } else if (!camCfg.autoOrbit || isLocked) {
      this.orbitAngle *= Math.pow(isLocked ? 0.03 : 0.18, dt);
    }

    const allowSway = Boolean(camCfg.idleSway && !isLocked);
    const swayY = allowSway ? Math.sin(t * 0.45) * 0.42 : 0;
    const swayX = allowSway ? Math.cos(t * 0.35) * 0.05 : 0;
    const floatY = allowSway ? Math.sin(t * 1.05) * 0.14 : 0;

    const baseRotY = camCfg.autoOrbit && !isLocked
      ? this.orbitAngle
      : swayY + this.smoothPointer.x * 0.16 * activeParallax;
    const baseRotX = swayX - this.smoothPointer.y * 0.11 * activeParallax;

    this.emblemGroup.position.y += (floatY - this.emblemGroup.position.y) * (1 - Math.exp(-8.0 * dt));
    this.emblemGroup.rotation.y = baseRotY + this.dragOffset.y;
    this.emblemGroup.rotation.x = baseRotX + this.dragOffset.x;

    const bassReflectionBoost = this.reactive.bass * 1.15;
    this.materialManager.updateReflectionBoost(
      environment.reflectionIntensity,
      bassReflectionBoost,
      this.warpFactor * 0.32
    );

    if (this.swooshGroup) {
      const orbitScale = 1 + this.reactive.bass * 0.14;
      this.swooshGroup.scale.set(orbitScale, orbitScale, 1 + this.reactive.bass * 0.08);
    }

    if (this.flareData && this.flareData.group.visible) {
      const flareScaleMult =
        effects.flareIntensity *
        (1 + this.reactive.treble * 0.55 + this.reactive.mid * 0.25 + this.warpFactor * 0.22);

      const uBase = this.flareData.upperFlare.userData.baseScale;
      const lBase = this.flareData.lowerFlare.userData.baseScale;

      this.flareData.upperFlare.scale.set(uBase * flareScaleMult, uBase * flareScaleMult, 1);
      this.flareData.upperFlare.material.rotation = t * 0.24;

      this.flareData.lowerFlare.scale.set(lBase * flareScaleMult, lBase * flareScaleMult, 1);
      this.flareData.lowerFlare.material.rotation = -t * 0.24;
    }

    this.starfield.update(dt, {
      baseSpeed: environment.starSpeed,
      baseSize: environment.starSize,
      baseBrightness: environment.starBrightness,
      warpFactor: this.warpFactor,
      midEnergy: this.reactive.mid,
      trebleEnergy: this.reactive.treble
    });

    this.renderer.render(this.scene, this.camera);
  }

  captureSnapshot({
    width = 1920,
    height = 1080,
    transparent = false,
    hideStars = false,
    cinemaGrade = true,
    watermark = false
  } = {}) {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Scene renderer is not initialized.');
    }

    const THREE = getTHREE();
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevPixelRatio = this.renderer.getPixelRatio();
    const prevAspect = this.camera.aspect;
    const prevClearColor = new THREE.Color();
    this.renderer.getClearColor(prevClearColor);
    const prevClearAlpha = this.renderer.getClearAlpha();
    const prevFog = this.scene.fog;
    const prevStarsVisible = this.starfield && this.starfield.points ? this.starfield.points.visible : true;
    const prevBacklightVisible = this.backlightSprite ? this.backlightSprite.visible : true;

    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      if (transparent) {
        this.scene.fog = null;
        this.renderer.setClearColor(0x000000, 0);
        if (this.backlightSprite) this.backlightSprite.visible = false;
      } else {
        this.renderer.setClearColor(prevClearColor, 1);
      }

      if (hideStars && this.starfield) {
        this.starfield.setVisible(false);
      }

      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      if (transparent || !cinemaGrade) {
        return this.renderer.domElement.toDataURL('image/png');
      }

      const postCanvas = document.createElement('canvas');
      postCanvas.width = width;
      postCanvas.height = height;
      const ctx = postCanvas.getContext('2d');

      ctx.drawImage(this.renderer.domElement, 0, 0, width, height);

      try {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const blurPx = Math.max(8, Math.round(Math.min(width, height) * 0.014));
        ctx.filter = `blur(${blurPx}px) brightness(1.22)`;
        ctx.globalAlpha = 0.24;
        ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
        ctx.restore();
      } catch (_) {

      }

      const vignetteStrength = this.store.getState().effects.vignetteStrength ?? 0.72;
      if (vignetteStrength > 0.01) {
        const cx = width * 0.5;
        const cy = height * 0.5;
        const outerR = Math.hypot(cx, cy);
        const innerR = outerR * 0.44;
        const vg = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vg.addColorStop(0.65, `rgba(0, 0, 0, ${(vignetteStrength * 0.42).toFixed(3)})`);
        vg.addColorStop(1, `rgba(0, 0, 0, ${(vignetteStrength * 0.88).toFixed(3)})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, width, height);
      }

      if (watermark) {
        ctx.save();
        const fontSize = Math.max(12, Math.round(Math.min(width, height) * 0.012));
        ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(230, 232, 236, 0.34)';
        ctx.textAlign = 'right';
        ctx.fillText('ERATIS STUDIO · @ERATIS-HQ', width - fontSize * 2.2, height - fontSize * 1.8);
        ctx.restore();
      }

      return postCanvas.toDataURL('image/png');
    } finally {
      this.scene.fog = prevFog;
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);
      if (this.starfield) {
        this.starfield.setVisible(prevStarsVisible);
      }
      if (this.backlightSprite) {
        this.backlightSprite.visible = prevBacklightVisible;
      }
      this.renderer.setPixelRatio(prevPixelRatio);
      this.renderer.setSize(prevSize.x, prevSize.y, false);
      this.camera.aspect = prevAspect;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this._disposed = true;
    this._stopLoop();

    if (this._textDebounceTimer) {
      clearTimeout(this._textDebounceTimer);
      this._textDebounceTimer = null;
    }
    this._textReportListeners.clear();

    for (const cleanup of this._cleanups) {
      try {
        cleanup();
      } catch (_) {

      }
    }
    this._cleanups = [];

    const sharedMats = this.materialManager ? new Set(this.materialManager.materials.values()) : null;

    if (this.eratisGroup) {
      disposeObject3D(this.eratisGroup, { skipMaterials: sharedMats, disposeTextures: false });
    }
    if (this.swooshGroup) {
      disposeObject3D(this.swooshGroup, { skipMaterials: sharedMats, disposeTextures: false });
    }
    if (this.flareData) {
      if (this.flareData.upperFlare && this.flareData.upperFlare.material) {
        this.flareData.upperFlare.material.dispose();
      }
      if (this.flareData.lowerFlare && this.flareData.lowerFlare.material) {
        this.flareData.lowerFlare.material.dispose();
      }
      if (this.flareData.texture) {
        this.flareData.texture.dispose();
      }
    }
    if (this.textBuilder) {
      this.textBuilder.dispose(sharedMats);
    }
    if (this.imageLayer) {
      this.imageLayer.dispose();
    }
    if (this.starfield) {
      this.starfield.dispose();
    }
    if (this.backlightSprite && this.backlightSprite.material) {
      this.backlightSprite.material.dispose();
    }
    if (this.backlightTexture) {
      this.backlightTexture.dispose();
    }
    if (this.materialManager) {
      this.materialManager.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
