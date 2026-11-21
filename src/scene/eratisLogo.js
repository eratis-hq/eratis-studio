function getTHREE() {
  if (!window.THREE) {
    throw new Error('Three.js r128 must be loaded before creating ERATIS geometry.');
  }
  return window.THREE;
}

export function disposeObject3D(root, { skipMaterials = null, disposeTextures = true } = {}) {
  if (!root) return;

  const isSkipped = (mat) => {
    if (!skipMaterials) return false;
    if (skipMaterials instanceof Set) return skipMaterials.has(mat);
    if (Array.isArray(skipMaterials)) return skipMaterials.includes(mat);
    return skipMaterials === mat;
  };

  root.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || isSkipped(mat)) continue;
        if (disposeTextures) {
          const textureProps = [
            'map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap',
            'emissiveMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap'
          ];
          for (const prop of textureProps) {
            if (mat[prop] && typeof mat[prop].dispose === 'function') {
              mat[prop].dispose();
            }
          }
        }
        if (typeof mat.dispose === 'function') {
          mat.dispose();
        }
      }
    }
  });
}

function createPolygonShape(outerPts, holesPts = []) {
  const THREE = getTHREE();
  const shape = new THREE.Shape();
  shape.moveTo(outerPts[0][0], outerPts[0][1]);
  for (let i = 1; i < outerPts.length; i++) {
    shape.lineTo(outerPts[i][0], outerPts[i][1]);
  }
  shape.closePath();

  for (const hPts of holesPts) {
    const hole = new THREE.Path();
    hole.moveTo(hPts[0][0], hPts[0][1]);
    for (let i = 1; i < hPts.length; i++) {
      hole.lineTo(hPts[i][0], hPts[i][1]);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  return shape;
}

export function createEratisLetters(material) {
  const THREE = getTHREE();
  const group = new THREE.Group();
  group.name = 'eratis-letters';

  const extrudeSettings = {
    depth: 0.56,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.11,
    bevelSegments: 6,
    steps: 1
  };

  const letters = [

    createPolygonShape([
      [-5.55, -0.74], [-3.88, -0.74], [-3.78, -0.41], [-4.96, -0.41],
      [-4.87, -0.15], [-3.94, -0.15], [-3.84, 0.15], [-4.77, 0.15],
      [-4.68, 0.41], [-3.56, 0.41], [-3.46, 0.74], [-5.12, 0.74]
    ]),

    createPolygonShape(
      [
        [-3.52, -0.74], [-3.02, -0.74], [-2.88, -0.25], [-2.40, -0.25],
        [-2.04, -0.74], [-1.48, -0.74], [-1.92, -0.21],
        [-1.63, -0.13], [-1.45, 0.06], [-1.40, 0.31],
        [-1.47, 0.57], [-1.72, 0.74], [-3.06, 0.74]
      ],
      [[
        [-2.80, 0.03], [-2.12, 0.03], [-1.95, 0.14], [-1.92, 0.29],
        [-1.98, 0.42], [-2.16, 0.46], [-2.67, 0.46]
      ]]
    ),

    createPolygonShape(
      [
        [-1.48, -0.74], [-0.96, -0.74], [-0.80, -0.42], [-0.04, -0.42],
        [0.04, -0.74], [0.56, -0.74], [0.08, 0.74], [-0.46, 0.74]
      ],
      [[
        [-0.64, -0.13], [-0.12, -0.13], [-0.29, 0.40]
      ]]
    ),

    createPolygonShape([
      [0.96, -0.74], [1.48, -0.74], [1.83, 0.41], [2.48, 0.41],
      [2.58, 0.74], [0.76, 0.74], [0.66, 0.41], [1.31, 0.41]
    ]),

    createPolygonShape([
      [2.36, -0.74], [2.88, -0.74], [3.32, 0.74], [2.80, 0.74]
    ]),

    createPolygonShape([
      [3.14, -0.74], [4.54, -0.74], [4.94, -0.60], [5.14, -0.36],
      [5.12, -0.08], [4.89, 0.11], [4.52, 0.17], [3.92, 0.17],
      [3.84, 0.27], [3.88, 0.38], [4.06, 0.43], [5.18, 0.43],
      [5.28, 0.74], [3.94, 0.74], [3.56, 0.60], [3.38, 0.36],
      [3.42, 0.08], [3.66, -0.09], [4.04, -0.14], [4.58, -0.14],
      [4.64, -0.27], [4.58, -0.39], [4.38, -0.43], [3.24, -0.43]
    ])
  ];

  for (const shape of letters) {
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -extrudeSettings.depth * 0.5);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isStudioMaterialTarget = true;
    group.add(mesh);
  }

  return group;
}

export function createTaperedOrbitalTube(points, maxRadius, tubularSegments, radialSegments, material) {
  const THREE = getTHREE();
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const p = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const taper = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.72);
    const radius = Math.max(0.004, maxRadius * taper);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      const rx = radius * 1.15;
      const ry = radius * 0.72;

      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;

      vertices.push(
        p.x + (cos * rx * N.x + sin * ry * B.x),
        p.y + (cos * rx * N.y + sin * ry * B.y),
        p.z + (cos * rx * N.z + sin * ry * B.z)
      );
      normals.push(nx, ny, nz);
      uvs.push(u, j / radialSegments);
    }
  }

  for (let j = 1; j <= tubularSegments; j++) {
    for (let i = 1; i <= radialSegments; i++) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isStudioMaterialTarget = true;
  return mesh;
}

export function createOrbitalSwooshes(material) {
  const THREE = getTHREE();
  const group = new THREE.Group();
  group.name = 'eratis-orbital-swooshes';

  const upperPoints = [
    new THREE.Vector3(-0.75, 0.88, -0.35),
    new THREE.Vector3(1.45, 1.42, 0.10),
    new THREE.Vector3(4.15, 1.66, 0.34),
    new THREE.Vector3(5.75, 1.48, 0.12),
    new THREE.Vector3(5.88, 1.06, -0.26),
    new THREE.Vector3(4.35, 0.54, -0.58)
  ];
  const upperMesh = createTaperedOrbitalTube(upperPoints, 0.24, 96, 18, material);
  upperMesh.name = 'orbital-upper';
  group.add(upperMesh);

  const lowerPoints = [
    new THREE.Vector3(0.85, -0.88, -0.35),
    new THREE.Vector3(-1.35, -1.42, 0.10),
    new THREE.Vector3(-3.95, -1.66, 0.34),
    new THREE.Vector3(-5.55, -1.48, 0.12),
    new THREE.Vector3(-5.68, -1.06, -0.26),
    new THREE.Vector3(-4.15, -0.54, -0.58)
  ];
  const lowerMesh = createTaperedOrbitalTube(lowerPoints, 0.24, 96, 18, material);
  lowerMesh.name = 'orbital-lower';
  group.add(lowerMesh);

  return group;
}

export function createOrbitalFlares(flareTexture) {
  const THREE = getTHREE();
  const group = new THREE.Group();
  group.name = 'eratis-orbital-flares';

  const upperMat = new THREE.SpriteMaterial({
    map: flareTexture,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const upperFlare = new THREE.Sprite(upperMat);
  upperFlare.position.set(4.15, 1.66, 0.46);
  upperFlare.scale.set(2.55, 2.55, 1);
  upperFlare.userData.baseScale = 2.55;
  group.add(upperFlare);

  const lowerMat = new THREE.SpriteMaterial({
    map: flareTexture,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const lowerFlare = new THREE.Sprite(lowerMat);
  lowerFlare.position.set(-3.95, -1.66, 0.46);
  lowerFlare.scale.set(2.25, 2.25, 1);
  lowerFlare.userData.baseScale = 2.25;
  group.add(lowerFlare);

  return { group, upperFlare, lowerFlare, texture: flareTexture };
}
