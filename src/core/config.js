export const APP_INFO = Object.freeze({
  name: 'ERATIS — Interactive 3D Identity Studio',
  shortName: 'ERATIS',
  version: '1.0.0',
  schemaVersion: '1.0.0',
  githubUrl: 'https://github.com/eratis-hq',
  githubHandle: 'eratis-hq',
  signatureAssetPath: './public/assets/eratis-signature.svg'
});

export const STORAGE_KEYS = Object.freeze({
  CUSTOM_PRESETS: 'eratis_studio_custom_presets_v1',
  ACTIVE_STATE: 'eratis_studio_active_state_v1'
});

export const IDENTITY_MODES = Object.freeze(['eratis', 'text', 'image']);

export const REPEAT_MODES = Object.freeze(['off', 'all', 'one']);

export const AUDIO_BANDS = Object.freeze({
  BASS: Object.freeze({ minHz: 20, maxHz: 150 }),
  MID: Object.freeze({ minHz: 150, maxHz: 2500 }),
  TREBLE: Object.freeze({ minHz: 2500, maxHz: 12000 }),
  FFT_SIZE: 2048,
  SMOOTHING: 0.8
});

export const MATERIAL_CATALOG = Object.freeze({
  liquidChrome: {
    id: 'liquidChrome',
    label: 'Liquid Chrome',
    swatch: 'linear-gradient(135deg, #ffffff 0%, #9ea4b0 42%, #111317 55%, #f5f7fa 100%)',
    type: 'standard',
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.045,
    envMapIntensity: 1.75
  },
  silver: {
    id: 'silver',
    label: 'Silver',
    swatch: 'linear-gradient(135deg, #f7f9fc 0%, #c8cdd6 50%, #7d838e 100%)',
    type: 'standard',
    color: 0xe6eaf0,
    metalness: 0.96,
    roughness: 0.16,
    envMapIntensity: 1.48
  },
  gold24k: {
    id: 'gold24k',
    label: '24K Gold',
    swatch: 'linear-gradient(135deg, #fff1b8 0%, #f5c249 48%, #8f6212 100%)',
    type: 'standard',
    color: 0xffd25a,
    metalness: 1.0,
    roughness: 0.085,
    envMapIntensity: 1.72
  },
  matteMetal: {
    id: 'matteMetal',
    label: 'Matte Metal',
    swatch: 'linear-gradient(135deg, #b6bcc6 0%, #6c727e 55%, #32363e 100%)',
    type: 'standard',
    color: 0xa7adb8,
    metalness: 0.86,
    roughness: 0.42,
    envMapIntensity: 1.15
  },
  frostedGlass: {
    id: 'frostedGlass',
    label: 'Frosted Glass',
    swatch: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(196,210,228,0.42) 55%, rgba(65,78,96,0.5) 100%)',
    type: 'physical',
    color: 0xeaf2ff,
    metalness: 0.08,
    roughness: 0.22,
    opacity: 0.54,
    transparent: true,
    clearcoat: 1.0,
    clearcoatRoughness: 0.16,
    reflectivity: 0.95,
    envMapIntensity: 1.85
  },
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    swatch: 'linear-gradient(135deg, #4b505a 0%, #101216 45%, #020203 100%)',
    type: 'physical',
    color: 0x101216,
    metalness: 0.78,
    roughness: 0.075,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 1.0,
    envMapIntensity: 1.95
  }
});

export const MATERIAL_IDS = Object.freeze(Object.keys(MATERIAL_CATALOG));

export const FONT_OPTIONS = Object.freeze([
  {
    id: 'helvetiker_bold',
    label: 'Helvetiker Bold',
    format: 'typeface',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json'
    ]
  },
  {
    id: 'helvetiker_regular',
    label: 'Helvetiker Regular',
    format: 'typeface',
    category: 'sans',
    weight: 'regular',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json'
    ]
  },
  {
    id: 'optimer_bold',
    label: 'Optimer Bold',
    format: 'typeface',
    category: 'serif',
    weight: 'bold',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/optimer_bold.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/optimer_bold.typeface.json'
    ]
  },
  {
    id: 'optimer_regular',
    label: 'Optimer Regular',
    format: 'typeface',
    category: 'serif',
    weight: 'regular',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/optimer_regular.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/optimer_regular.typeface.json'
    ]
  },
  {
    id: 'gentilis_bold',
    label: 'Gentilis Bold',
    format: 'typeface',
    category: 'serif',
    weight: 'bold',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/gentilis_bold.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/gentilis_bold.typeface.json'
    ]
  },
  {
    id: 'gentilis_regular',
    label: 'Gentilis Regular',
    format: 'typeface',
    category: 'serif',
    weight: 'regular',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/gentilis_regular.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/gentilis_regular.typeface.json'
    ]
  },
  {
    id: 'droid_sans_bold',
    label: 'Droid Sans Bold',
    format: 'typeface',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/droid/droid_sans_bold.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/droid/droid_sans_bold.typeface.json'
    ]
  },
  {
    id: 'droid_sans_regular',
    label: 'Droid Sans Regular',
    format: 'typeface',
    category: 'sans',
    weight: 'regular',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/droid/droid_sans_regular.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/droid/droid_sans_regular.typeface.json'
    ]
  },
  {
    id: 'droid_serif_bold',
    label: 'Droid Serif Bold',
    format: 'typeface',
    category: 'serif',
    weight: 'bold',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/droid/droid_serif_bold.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/droid/droid_serif_bold.typeface.json'
    ]
  },
  {
    id: 'droid_serif_regular',
    label: 'Droid Serif Regular',
    format: 'typeface',
    category: 'serif',
    weight: 'regular',
    urls: [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/droid/droid_serif_regular.typeface.json',
      'https://unpkg.com/three@0.128.0/examples/fonts/droid/droid_serif_regular.typeface.json'
    ]
  },
  {
    id: 'orbitron_bold',
    label: 'Orbitron Sci-Fi',
    format: 'ttf',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://fonts.gstatic.com/s/orbitron/v35/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1ny_Cmxpg.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/orbitron/Orbitron%5Bwght%5D.ttf'
    ]
  },
  {
    id: 'cinzel_bold',
    label: 'Cinzel Roman',
    format: 'ttf',
    category: 'serif',
    weight: 'bold',
    urls: [
      'https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-jHgTYo.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cinzel/Cinzel%5Bwght%5D.ttf'
    ]
  },
  {
    id: 'montserrat_black',
    label: 'Montserrat Display',
    format: 'ttf',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvC70w-.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montserrat/Montserrat%5Bwght%5D.ttf'
    ]
  },
  {
    id: 'syne_extrabold',
    label: 'Syne Avant-Garde',
    format: 'ttf',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://fonts.gstatic.com/s/syne/v24/8vIS7w4qzmVxsWxjBZRjr0FKM_24vj6k.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/syne/Syne%5Bwght%5D.ttf'
    ]
  },
  {
    id: 'audiowide_regular',
    label: 'Audiowide Cyber',
    format: 'ttf',
    category: 'sans',
    weight: 'bold',
    urls: [
      'https://fonts.gstatic.com/s/audiowide/v22/l7gdbjpo0cum0ckerWCtkQ.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/audiowide/Audiowide-Regular.ttf'
    ]
  },
  {
    id: 'michroma_regular',
    label: 'Michroma Aerospace',
    format: 'ttf',
    category: 'sans',
    weight: 'regular',
    urls: [
      'https://fonts.gstatic.com/s/michroma/v21/PN_zRfy9qWD8fEagAMg6.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/michroma/Michroma-Regular.ttf'
    ]
  }
]);

export const FALLBACK_FONT_OPTIONS = Object.freeze({
  sansBold: {
    id: '__fallback_noto_sans_bold',
    label: 'Noto Sans Bold (Unicode Fallback)',
    format: 'ttf',
    urls: [
      'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
      'https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjammT.ttf'
    ]
  },
  sansRegular: {
    id: '__fallback_noto_sans_regular',
    label: 'Noto Sans Regular (Unicode Fallback)',
    format: 'ttf',
    urls: [
      'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
      'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf'
    ]
  },
  serifBold: {
    id: '__fallback_noto_serif_bold',
    label: 'Noto Serif Bold (Unicode Fallback)',
    format: 'ttf',
    urls: [
      'https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZT1ejwA.ttf',
      'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf'
    ]
  }
});

export const FONT_IDS = Object.freeze(FONT_OPTIONS.map((f) => f.id));

export const DEFAULT_STATE = Object.freeze({
  identity: Object.freeze({
    mode: 'eratis',
    material: 'liquidChrome',
    showOrbits: true,
    positionX: 0,
    positionY: 0,
    scale: 1.0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    text: Object.freeze({
      value: 'ERATIS',
      font: 'helvetiker_bold',
      letterSpacing: 0.14,
      italicSlant: 0.24,
      depth: 0.56,
      bevelSize: 0.08,
      bevelThickness: 0.12
    }),
    image: Object.freeze({
      opacity: 1.0,
      scale: 1.0,
      fileName: ''
    })
  }),
  environment: Object.freeze({
    backgroundColor: '#000000',
    fogDensity: 0.0075,
    exposure: 1.42,
    reflectionIntensity: 1.0,
    keyLightIntensity: 2.7,
    rimLightIntensity: 1.95,
    cursorLightIntensity: 2.5,
    starfieldEnabled: true,
    starCount: 2400,
    starSpeed: 1.0,
    starSize: 0.25,
    starBrightness: 0.92
  }),
  audio: Object.freeze({
    reactive: true,
    bassSensitivity: 1.0,
    midTrebleSensitivity: 1.0,
    volume: 0.85,
    muted: false,
    shuffle: false,
    repeat: 'off'
  }),
  camera: Object.freeze({
    distance: 25.5,
    fov: 38,
    autoOrbit: false,
    orbitSpeed: 0.55,
    parallaxStrength: 1.0,
    idleSway: true,
    staticLock: false
  }),
  effects: Object.freeze({
    warpActive: false,
    warpIntensity: 1.0,
    lensFlares: true,
    flareIntensity: 1.0,
    vignetteStrength: 0.72
  })
});

export const BUILTIN_PRESETS = Object.freeze([
  {
    id: 'eratis-liquid-chrome',
    name: 'ERATIS Liquid Chrome',
    builtin: true,
    description: 'Signature obsidian void with high-contrast liquid chrome and dual orbital flares.',
    state: DEFAULT_STATE
  },
  {
    id: 'solar-24k-gold',
    name: '24K Solar Gold',
    builtin: true,
    description: 'Lustrous 24K gold sculpture with intensified specular rim lighting.',
    state: {
      identity: {
        mode: 'eratis',
        material: 'gold24k',
        showOrbits: true,
        positionX: 0,
        positionY: 0,
        scale: 1.04,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        text: { ...DEFAULT_STATE.identity.text },
        image: { ...DEFAULT_STATE.identity.image }
      },
      environment: {
        ...DEFAULT_STATE.environment,
        exposure: 1.5,
        reflectionIntensity: 1.15,
        keyLightIntensity: 3.1,
        rimLightIntensity: 2.3,
        starSpeed: 0.75
      },
      audio: { ...DEFAULT_STATE.audio },
      camera: { ...DEFAULT_STATE.camera, distance: 24.5 },
      effects: { ...DEFAULT_STATE.effects, flareIntensity: 1.25 }
    }
  },
  {
    id: 'obsidian-stealth',
    name: 'Obsidian Stealth',
    builtin: true,
    description: 'Glossy volcanic obsidian finish sculpted by crisp silver studio rim highlights.',
    state: {
      identity: {
        mode: 'eratis',
        material: 'obsidian',
        showOrbits: true,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        text: { ...DEFAULT_STATE.identity.text },
        image: { ...DEFAULT_STATE.identity.image }
      },
      environment: {
        ...DEFAULT_STATE.environment,
        exposure: 1.58,
        reflectionIntensity: 1.35,
        keyLightIntensity: 3.2,
        rimLightIntensity: 2.8,
        cursorLightIntensity: 3.2,
        starBrightness: 0.72
      },
      audio: { ...DEFAULT_STATE.audio },
      camera: { ...DEFAULT_STATE.camera, distance: 24.8 },
      effects: { ...DEFAULT_STATE.effects, flareIntensity: 0.85, vignetteStrength: 0.85 }
    }
  },
  {
    id: 'frosted-nebula',
    name: 'Frosted Nebula',
    builtin: true,
    description: 'Translucent frosted glass identity floating inside a dense shimmering starfield.',
    state: {
      identity: {
        mode: 'eratis',
        material: 'frostedGlass',
        showOrbits: true,
        positionX: 0,
        positionY: 0,
        scale: 1.02,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        text: { ...DEFAULT_STATE.identity.text },
        image: { ...DEFAULT_STATE.identity.image }
      },
      environment: {
        ...DEFAULT_STATE.environment,
        exposure: 1.48,
        reflectionIntensity: 1.25,
        starCount: 3400,
        starSize: 0.28,
        starBrightness: 1.0
      },
      audio: { ...DEFAULT_STATE.audio },
      camera: { ...DEFAULT_STATE.camera, distance: 25.0, autoOrbit: false },
      effects: { ...DEFAULT_STATE.effects, flareIntensity: 1.1 }
    }
  },
  {
    id: 'hyperdrive-silver',
    name: 'Hyperdrive Silver',
    builtin: true,
    description: 'Brushed silver emblem in continuous 360° orbit with warp starlight active.',
    state: {
      identity: {
        mode: 'eratis',
        material: 'silver',
        showOrbits: true,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        text: { ...DEFAULT_STATE.identity.text },
        image: { ...DEFAULT_STATE.identity.image }
      },
      environment: {
        ...DEFAULT_STATE.environment,
        starCount: 3000,
        starSpeed: 1.35
      },
      audio: { ...DEFAULT_STATE.audio },
      camera: { ...DEFAULT_STATE.camera, distance: 26.0, autoOrbit: true, orbitSpeed: 0.72 },
      effects: { ...DEFAULT_STATE.effects, warpActive: true, warpIntensity: 1.15, flareIntensity: 1.3 }
    }
  }
]);
