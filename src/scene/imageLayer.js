import { disposeObject3D } from './eratisLogo.js';

function getTHREE() {
  if (!window.THREE) {
    throw new Error('Three.js r128 must be loaded before using ImageLayer.');
  }
  return window.THREE;
}

const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|svg)$/i;

export class ImageLayer {
  constructor() {
    const THREE = getTHREE();
    this.group = new THREE.Group();
    this.group.name = 'custom-image-layer';
    this.mesh = null;
    this.texture = null;
    this.objectUrl = null;
    this.fileName = '';
    this.naturalAspect = 1.0;
    this._opacity = 1.0;
    this._layerScale = 1.0;
  }

  getGroup() {
    return this.group;
  }

  hasImage() {
    return Boolean(this.mesh && this.texture);
  }

  getFileName() {
    return this.fileName;
  }

  static isSupportedImageFile(file) {
    if (!file) return false;
    if (file.type && /^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type)) {
      return true;
    }
    return SUPPORTED_IMAGE_EXTENSIONS.test(file.name || '');
  }

  async loadFile(file, maxAnisotropy = 4) {
    if (!ImageLayer.isSupportedImageFile(file)) {
      throw new Error('Unsupported image format. Please upload PNG, JPG, WebP, or SVG.');
    }

    const THREE = getTHREE();
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '');

    const tempUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to decode uploaded image file.'));
        image.src = tempUrl;
      });

      const rawW = img.naturalWidth || img.width || 1024;
      const rawH = img.naturalHeight || img.height || 1024;
      const aspect = rawW > 0 && rawH > 0 ? rawW / rawH : 1.0;

      let texture;
      if (isSvg) {

        const maxTexDim = 2048;
        let canvasW = rawW;
        let canvasH = rawH;
        if (Math.max(canvasW, canvasH) < 1024) {
          const boost = 1024 / Math.max(canvasW, canvasH);
          canvasW = Math.round(canvasW * boost);
          canvasH = Math.round(canvasH * boost);
        }
        if (Math.max(canvasW, canvasH) > maxTexDim) {
          const shrink = maxTexDim / Math.max(canvasW, canvasH);
          canvasW = Math.round(canvasW * shrink);
          canvasH = Math.round(canvasH * shrink);
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(2, canvasW);
        canvas.height = Math.max(2, canvasH);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        texture = new THREE.CanvasTexture(canvas);
      } else {
        texture = new THREE.Texture(img);
      }

      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = Math.min(8, maxAnisotropy || 4);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;

      this.clear();

      this.objectUrl = tempUrl;
      this.texture = texture;
      this.fileName = file.name || 'Custom Image';
      this.naturalAspect = aspect;

      const maxHeight = 4.2;
      const maxWidth = 9.4;
      let planeH = maxHeight;
      let planeW = planeH * aspect;
      if (planeW > maxWidth) {
        planeW = maxWidth;
        planeH = planeW / aspect;
      }

      const geometry = new THREE.PlaneGeometry(planeW, planeH);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: this._opacity,
        alphaTest: 0.004,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'flat-media-plane';
      this.mesh = mesh;
      this.group.add(mesh);
      this.group.scale.setScalar(this._layerScale);

      return {
        fileName: this.fileName,
        width: rawW,
        height: rawH,
        aspect
      };
    } catch (err) {
      URL.revokeObjectURL(tempUrl);
      throw err;
    }
  }

  setOpacity(opacity) {
    this._opacity = Math.max(0.05, Math.min(1.0, Number(opacity) || 1.0));
    if (this.mesh && this.mesh.material) {
      this.mesh.material.opacity = this._opacity;
      this.mesh.material.needsUpdate = true;
    }
  }

  setLayerScale(scale) {
    this._layerScale = Math.max(0.2, Math.min(3.0, Number(scale) || 1.0));
    this.group.scale.setScalar(this._layerScale);
  }

  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      disposeObject3D(child, { disposeTextures: true });
      this.group.remove(child);
    }
    this.mesh = null;
    this.texture = null;
    this.fileName = '';
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  dispose() {
    this.clear();
  }
}
