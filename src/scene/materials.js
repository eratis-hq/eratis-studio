import { MATERIAL_CATALOG } from '../core/config.js';

function getTHREE() {
  if (!window.THREE) {
    throw new Error('Three.js r128 must be loaded before initializing materials.');
  }
  return window.THREE;
}

export function createStudioEnvMap() {
  const THREE = getTHREE();
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.00, '#FFFFFF');
  grad.addColorStop(0.11, '#F0F2F6');
  grad.addColorStop(0.24, '#9BA0AA');
  grad.addColorStop(0.38, '#2A2D34');
  grad.addColorStop(0.46, '#040405');
  grad.addColorStop(0.50, '#FFFFFF');
  grad.addColorStop(0.54, '#040405');
  grad.addColorStop(0.62, '#2A2D34');
  grad.addColorStop(0.76, '#9BA0AA');
  grad.addColorStop(0.89, '#F0F2F6');
  grad.addColorStop(1.00, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.rotate(-0.24);
  ctx.translate(-width * 0.5, -height * 0.5);

  const strips = [
    { x: -160, w: 192, color: 'rgba(255, 255, 255, 0.98)' },
    { x: 216, w: 112, color: 'rgba(235, 238, 244, 0.92)' },
    { x: 496, w: 148, color: 'rgba(4, 4, 6, 0.92)' },
    { x: 760, w: 256, color: 'rgba(255, 255, 255, 1.0)' },
    { x: 1124, w: 132, color: 'rgba(115, 120, 130, 0.88)' },
    { x: 1400, w: 244, color: 'rgba(255, 255, 255, 0.99)' },
    { x: 1784, w: 164, color: 'rgba(232, 235, 240, 0.93)' }
  ];

  for (const s of strips) {
    const sg = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
    sg.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    sg.addColorStop(0.22, s.color);
    sg.addColorStop(0.78, s.color);
    sg.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(s.x, -320, s.w, height + 640);
  }
  ctx.restore();

  const highlights = [
    { x: 440, y: 256, r: 140, a: 0.6 },
    { x: 1560, y: 768, r: 150, a: 0.55 },
    { x: 1024, y: 512, r: 220, a: 0.35 }
  ];
  for (const h of highlights) {
    const rg = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r);
    rg.addColorStop(0, `rgba(255, 255, 255, ${h.a})`);
    rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

export function createBacklightHaloTexture() {
  const THREE = getTHREE();
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(256, 256, 4, 256, 256, 250);
  g.addColorStop(0.0, 'rgba(235, 240, 250, 0.19)');
  g.addColorStop(0.32, 'rgba(180, 190, 208, 0.08)');
  g.addColorStop(0.68, 'rgba(90, 98, 115, 0.025)');
  g.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createStarburstTexture() {
  const THREE = getTHREE();
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const core = ctx.createRadialGradient(128, 128, 2, 128, 128, 120);
  core.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
  core.addColorStop(0.16, 'rgba(232, 234, 238, 0.92)');
  core.addColorStop(0.42, 'rgba(180, 184, 190, 0.28)');
  core.addColorStop(1.00, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(128, 128);

  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    const spike = ctx.createLinearGradient(-126, 0, 126, 0);
    spike.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    spike.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    spike.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = spike;
    ctx.beginPath();
    ctx.ellipse(0, 0, 126, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.rotate(Math.PI / 4);
  for (let i = 0; i < 2; i++) {
    ctx.rotate((i * Math.PI) / 2);
    ctx.fillStyle = 'rgba(235, 238, 244, 0.62)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createStarDotTexture() {
  const THREE = getTHREE();
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(230, 232, 236, 0.86)');
  g.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class MaterialManager {
  constructor() {
    this.envMap = createStudioEnvMap();
    this.materials = new Map();
    this.activeMaterialId = 'liquidChrome';
    this._buildCatalog();
  }

  _buildCatalog() {
    const THREE = getTHREE();
    for (const [id, def] of Object.entries(MATERIAL_CATALOG)) {
      let mat;
      if (def.type === 'physical') {
        mat = new THREE.MeshPhysicalMaterial({
          color: def.color,
          metalness: def.metalness,
          roughness: def.roughness,
          clearcoat: def.clearcoat ?? 0,
          clearcoatRoughness: def.clearcoatRoughness ?? 0.1,
          reflectivity: def.reflectivity ?? 0.9,
          transparent: Boolean(def.transparent),
          opacity: def.opacity ?? 1.0,
          depthWrite: !def.transparent,
          side: def.transparent ? THREE.DoubleSide : THREE.FrontSide,
          envMap: this.envMap,
          envMapIntensity: def.envMapIntensity
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: def.color,
          metalness: def.metalness,
          roughness: def.roughness,
          envMap: this.envMap,
          envMapIntensity: def.envMapIntensity
        });
      }
      mat.userData.baseEnvMapIntensity = def.envMapIntensity;
      this.materials.set(id, mat);
    }
  }

  getEnvMap() {
    return this.envMap;
  }

  getMaterial(id = this.activeMaterialId) {
    if (this.materials.has(id)) {
      this.activeMaterialId = id;
      return this.materials.get(id);
    }
    this.activeMaterialId = 'liquidChrome';
    return this.materials.get('liquidChrome');
  }

  getActiveMaterial() {
    return this.getMaterial(this.activeMaterialId);
  }

  updateReflectionBoost(reflectionMultiplier = 1.0, audioBassBoost = 0, warpBoost = 0) {
    const mat = this.getActiveMaterial();
    if (!mat) return;
    const base = mat.userData.baseEnvMapIntensity || 1.72;
    mat.envMapIntensity = Math.max(0.1, base * reflectionMultiplier + audioBassBoost + warpBoost);
  }

  dispose() {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
    if (this.envMap) {
      this.envMap.dispose();
      this.envMap = null;
    }
  }
}
