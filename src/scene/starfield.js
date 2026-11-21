import { createStarDotTexture } from './materials.js';

function getTHREE() {
  if (!window.THREE) {
    throw new Error('Three.js r128 must be loaded before creating Starfield.');
  }
  return window.THREE;
}

export class Starfield {
  constructor(scene, initialCount = 2400) {
    this.scene = scene;
    this.count = Math.max(200, Math.min(5000, Math.round(initialCount)));
    this.texture = createStarDotTexture();
    this.geometry = null;
    this.material = null;
    this.points = null;
    this.velocities = null;
    this._build(this.count);
  }

  _build(count) {
    const THREE = getTHREE();

    if (this.points) {
      this.scene.remove(this.points);
    }
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }

    this.count = Math.max(200, Math.min(5000, Math.round(count)));

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const velocities = new Float32Array(this.count);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xe6e8ec),
      new THREE.Color(0xb8bcc4),
      new THREE.Color(0x7a7e85)
    ];

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 92;
      positions[i * 3 + 2] = -Math.random() * 155 + 18;

      velocities[i] = 2.4 + Math.random() * 5.8;

      const c = palette[Math.floor(Math.random() * palette.length)];
      const intensity = 0.48 + Math.random() * 0.52;
      colors[i * 3] = c.r * intensity;
      colors[i * 3 + 1] = c.g * intensity;
      colors[i * 3 + 2] = c.b * intensity;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.geometry = geo;
    this.material = mat;
    this.velocities = velocities;
    this.points = new THREE.Points(geo, mat);
    this.points.name = 'deep-space-starfield';
    this.scene.add(this.points);
  }

  setCount(nextCount) {
    const clamped = Math.max(200, Math.min(5000, Math.round(nextCount)));
    if (clamped !== this.count) {
      const wasVisible = this.points ? this.points.visible : true;
      this._build(clamped);
      if (this.points) {
        this.points.visible = wasVisible;
      }
    }
  }

  setVisible(visible) {
    if (this.points) {
      this.points.visible = Boolean(visible);
    }
  }

  update(dt, { baseSpeed = 1.0, baseSize = 0.25, baseBrightness = 0.92, warpFactor = 0, midEnergy = 0, trebleEnergy = 0 }) {
    if (!this.geometry || !this.points || !this.points.visible) return;

    const pos = this.geometry.attributes.position.array;
    const audioSpeedBoost = midEnergy * 4.2 + trebleEnergy * 5.6;
    const speedMultiplier = Math.max(0.05, baseSpeed) * (1 + warpFactor * 9.5 + audioSpeedBoost);

    if (this.material) {
      this.material.size = Math.max(0.06, baseSize + warpFactor * 0.16 + trebleEnergy * 0.12);
      this.material.opacity = Math.min(1.0, Math.max(0.1, baseBrightness + trebleEnergy * 0.22 + warpFactor * 0.08));
    }

    for (let i = 0; i < this.count; i++) {
      const zIdx = i * 3 + 2;
      pos[zIdx] += this.velocities[i] * dt * speedMultiplier;
      if (pos[zIdx] > 26) {
        pos[zIdx] = -132;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.points) {
      this.scene.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
    this.velocities = null;
  }
}
